import { resolveSemester, semesterCollectionPath } from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { error } from '@sveltejs/kit'
import type {
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:applications')
  const semesterId = resolveSemester(url.searchParams.get('semester'))
  const collectionName = semesterCollectionPath(semesterId, 'applications')
  // Decision docs are always keyed by the application's own id, so this is derived
  // rather than trusted from a stored reference field on the application - see the
  // meta.decided writeup for why that stored-reference shape was unsafe.
  const decisionsCollectionName = semesterCollectionPath(
    semesterId,
    'decisions',
  )
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '25'
    const pageNum = parseInt(pageStr, 10)
    const limitVal = parseInt(limitStr, 10)
    const offsetVal = (pageNum - 1) * limitVal

    const filter = url.searchParams.get('filter')
    try {
      let dbQuery: Query

      if (filter === 'undecided') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('meta.submitted', '==', true)
          .where('meta.decided', '==', false)
          .orderBy('timestamps.updated', 'desc')
      } else if (filter === 'inPerson') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('program.inPerson', '==', true)
          .orderBy('timestamps.updated', 'desc')
      } else if (filter === 'incomplete') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('meta.submitted', '==', false)
          .orderBy('timestamps.updated', 'desc')
      } else if (filter === 'complete') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('meta.submitted', '==', true)
          .orderBy('timestamps.updated', 'desc')
      } else {
        dbQuery = adminDb
          .collection(collectionName)
          .where('meta.submitted', '==', true)
          .orderBy('timestamps.updated', 'desc')
      }

      dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

      const snapshot = await dbQuery.get()

      const decisions = (
        await Promise.all(
          snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data() as Data.Application<'server'>
            return data.meta.decided
              ? adminDb.collection(decisionsCollectionName).doc(doc.id).get()
              : null
          }),
        )
      ).map((doc: DocumentSnapshot | null) =>
        doc
          ? (doc.data() as {
              type: Data.Decision
              likelyDecision: string
              notes: string
            })
          : null,
      )

      return {
        applications: snapshot.docs.map(
          (doc: QueryDocumentSnapshot, i: number) => {
            const data = doc.data() as Data.Application<'server'>
            return {
              id: doc.id,
              values: {
                ...data,
                meta: {
                  ...data.meta,
                  decision: decisions.at(i),
                },
                timestamps: {
                  updated: data.timestamps.updated.toDate(),
                  created: data.timestamps.created.toDate(),
                },
              },
            }
          },
        ),
        page: pageNum,
        limit: limitVal,
      }
    } catch (err: any) {
      console.error('[Load Error] applications page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching applications. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    try {
      const hits = await searchIndex<
        Omit<Data.Application<'server'>, 'meta' | 'timestamps'> & {
          meta: {
            id: string
            uid: string
            interview: boolean
            submitted: boolean
            decided: boolean
          }
          timestamps: {
            updated: Date
            created: Date
          }
        }
      >(collectionName, query)
      const decisions = (
        await Promise.all(
          hits.map((hit) =>
            hit.meta.decided
              ? adminDb
                  .collection(decisionsCollectionName)
                  .doc(hit.objectID)
                  .get()
              : null,
          ),
        )
      ).map((doc: DocumentSnapshot | null) =>
        doc
          ? (doc.data() as {
              type: Data.Decision
              likelyDecision: string
              notes: string
            })
          : null,
      )
      return {
        query,
        applications: hits.map((hit, i) => {
          return {
            id: hit.objectID,
            values: {
              personal: hit.personal,
              academic: hit.academic,
              program: hit.program,
              essay: hit.essay,
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
      console.error('[Search Error] applications search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
