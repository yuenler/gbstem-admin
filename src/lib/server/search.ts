import { env } from '$env/dynamic/private'
import { ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY } from '$env/static/private'
import { adminDb } from '$lib/server/firebase'
import { algoliasearch } from 'algoliasearch'

// Fallback to local search if:
// 1. Credentials are not set or are default placeholder values
// 2. Running in test environment (Jest/Playwright/Cypress/etc)
// 3. Explicitly requested via USE_LOCAL_SEARCH or VITE_USE_LOCAL_SEARCH env var
const isTest =
  typeof process !== 'undefined' &&
  process.env &&
  process.env.NODE_ENV === 'test'
const isLocalForced =
  env.USE_LOCAL_SEARCH === 'true' ||
  env.VITE_USE_LOCAL_SEARCH === 'true' ||
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.VITE_USE_LOCAL_SEARCH === 'true')

const useLocalSearch =
  !ALGOLIA_APP_ID ||
  !ALGOLIA_PRIVATE_KEY ||
  ALGOLIA_APP_ID === 'XY123AB456' ||
  ALGOLIA_APP_ID === 'algoliaApp' ||
  isTest ||
  isLocalForced

export async function searchIndex<T>(
  indexName: string,
  query: string,
): Promise<Array<T & { objectID: string }>> {
  if (useLocalSearch) {
    console.log(
      `[Search] Using local fallback search for query "${query}" on index "${indexName}"`,
    )
    const snapshot = await adminDb.collection(indexName).get()

    // Helper to sanitize Firestore Timestamps into standard Date objects
    const sanitize = (val: any): any => {
      if (val && typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          return val.toDate()
        }
        if (Array.isArray(val)) {
          return val.map(sanitize)
        }
        const res: any = {}
        for (const key of Object.keys(val)) {
          res[key] = sanitize(val[key])
        }
        return res
      }
      return val
    }

    const allDocs = snapshot.docs.map((doc) => {
      const data = sanitize(doc.data())
      return {
        objectID: doc.id,
        ...data,
      } as T & { objectID: string }
    })

    const lowerQuery = query.toLowerCase()

    const matchesQuery = (val: any): boolean => {
      if (typeof val === 'string') {
        return val.toLowerCase().includes(lowerQuery)
      }
      if (typeof val === 'number' || typeof val === 'boolean') {
        return String(val).toLowerCase().includes(lowerQuery)
      }
      if (typeof val === 'object' && val !== null) {
        if (val instanceof Date) {
          return val.toISOString().toLowerCase().includes(lowerQuery)
        }
        return Object.values(val).some(matchesQuery)
      }
      return false
    }

    return allDocs.filter((doc) => {
      // Prevent infinite loops or scanning of internal reference objects (like DocumentReference)
      // which have prototype methods that shouldn't be recursed or serialized.
      const safeDoc = { ...doc }
      // Filter out fields starting with _ or containing Firestore references
      for (const key of Object.keys(safeDoc)) {
        if (key === 'meta') {
          // Keep meta fields but omit decision reference if it's a Firestore DocumentReference
          const meta = (safeDoc as any)[key]
          if (meta && typeof meta === 'object') {
            const safeMeta = { ...meta }
            if (
              safeMeta.decision &&
              typeof safeMeta.decision.get === 'function'
            ) {
              delete safeMeta.decision
            }
            ;(safeDoc as any)[key] = safeMeta
          }
        }
      }
      return matchesQuery(safeDoc)
    })
  }

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY)
  const { hits } = await client.searchSingleIndex<T>({
    indexName,
    searchParams: {
      query,
    },
  })
  return hits as Array<T & { objectID: string }>
}
