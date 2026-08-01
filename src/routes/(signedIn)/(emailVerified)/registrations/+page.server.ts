import { resolveSemester, semesterCollectionPath } from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { error } from '@sveltejs/kit'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:registrations')
  const collectionName = semesterCollectionPath(
    resolveSemester(url.searchParams.get('semester')),
    'registrations',
  )
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '25'
    const pageNum = parseInt(pageStr, 10)
    const limitVal = parseInt(limitStr, 10)
    const offsetVal = (pageNum - 1) * limitVal

    const filter = url.searchParams.get('filter') ?? 'submitted'
    try {
      let dbQuery: Query

      if (filter === 'submitted') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('meta.submitted', '==', true)
          .orderBy('timestamps.updated', 'desc')
      } else if (filter === 'enrolled') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('enrolled', '==', true)
          .orderBy('timestamps.updated', 'desc')
      } else if (filter === 'not enrolled') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('enrolled', '==', false)
          .where('meta.submitted', '==', true)
          .orderBy('timestamps.updated', 'desc')
      } else if (filter === 'inPerson') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('program.inPerson', '==', true)
          .where('meta.submitted', '==', true)
          .orderBy('timestamps.updated', 'desc')
      } else if (filter === 'incomplete') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('meta.submitted', '==', false)
          .orderBy('timestamps.updated', 'desc')
      } else {
        dbQuery = adminDb
          .collection(collectionName)
          .orderBy('timestamps.updated', 'desc')
      }

      dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

      const snapshot = await dbQuery.get()

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
        page: pageNum,
        limit: limitVal,
      }
    } catch (err: any) {
      console.error('[Load Error] registrations page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching registrations. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    try {
      const hits = await searchIndex<
        Omit<Data.Registration<'server'>, 'meta' | 'timestamps'> & {
          meta: {
            uid: string
            submitted: boolean
            decision: string | null
          }
          timestamps: {
            updated: Date
            created: Date
          }
        }
      >(collectionName, query)
      const decisions = (
        await Promise.all(
          hits.map((hit) => {
            const decision = hit.meta.decision as any
            return decision
              ? typeof decision.get === 'function'
                ? decision.get()
                : adminDb.doc(decision).get()
              : null
          }),
        )
      ).map((doc: any) =>
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
      console.error('[Search Error] registrations search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
