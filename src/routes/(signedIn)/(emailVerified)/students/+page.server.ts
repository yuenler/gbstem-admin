import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import { ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY } from '$env/static/private'
import algoliasearch from 'algoliasearch'
import { registrationsCollection } from '$lib/data/collections'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:registrations')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const updated = url.searchParams.get('updated')
    const filter = url.searchParams.get('filter')
    try {
      let dbQuery: Query

      const collectionName = registrationsCollection
      if (filter === 'submitted') {
        dbQuery = updated
          ? adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .startAfter(new Date(updated))
          : adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
      } else if (filter === 'enrolled') {
        dbQuery = updated
          ? adminDb
            .collection(collectionName)
            .where('enrolled', '==', true)
          : adminDb
            .collection(collectionName)
            .where('enrolled', '==', true)
      } else {
        dbQuery = updated
          ? adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .orderBy('timestamps.updated', 'desc')
            .startAfter(new Date(updated))
          : adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .orderBy('timestamps.updated', 'desc')
      }


      // const snapshot = await dbQuery.limit(25).get()
      const snapshot = await dbQuery.get()

      // const snapshot = await dbQuery.get()


      return {
        registrations: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data() as Data.Registration<'server'>
          return {
            id: doc.id,
            values: {
              ...data,
              meta: {
                ...data.meta,
              },
              timestamps: {
                updated: data.timestamps.updated.toDate(),
                created: data.timestamps.created.toDate(),
              },
            },
          }
        }),
      }
    } catch (err: any) {
      console.error('[Load Error] students page load:', err)
      throw error(500, {
        message: 'Something went wrong while fetching students. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    try {
      const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY)
      const index = client.initIndex(registrationsCollection)
      const { hits } = await index.search<
        Omit<Data.Registration<'server'>, 'meta' | 'timestamps'> & {
          meta: {
            hhid: string
            uid: string
            submitted: boolean
            decision: string | null
          }
          timestamps: {
            updated: Date
            created: Date
          }
        }
      >(query)
      const decisions = (
        await Promise.all(
          hits.map((hit) => {
            const decision = hit.meta.decision
            return decision ? adminDb.doc(decision).get() : null
          }),
        )
      ).map((doc) =>
        doc ? (doc.data() as { type: Data.Decision }).type : null,
      )
      return {
        query,
        registrations: hits.map((hit, i) => {
          return {
            id: hit.objectID,
            values: {
              personal: hit.personal,
              academic: hit.academic,
              program: hit.program,
              agreements: hit.agreements,
              meta: {
                ...hit.meta,
                decision: decisions.at(i),
              },
              timestamps: hit.timestamps,
            },
          }
        }),
      }
    } catch (err: any) {
      console.error('[Search Error] students search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
