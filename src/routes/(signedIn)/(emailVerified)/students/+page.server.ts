import {
  registrationsCollection,
  classesCollection,
} from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { error } from '@sveltejs/kit'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'

export const load = (async ({ url, depends }) => {
  depends('app:registrations')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '25'
    const pageNum = parseInt(pageStr, 10)
    const limitVal = parseInt(limitStr, 10)
    const offsetVal = (pageNum - 1) * limitVal

    const filter = url.searchParams.get('filter')
    const course = url.searchParams.get('course')
    try {
      let dbQuery: Query

      const collectionName = registrationsCollection
      dbQuery = adminDb.collection(collectionName)

      if (filter === 'submitted') {
        dbQuery = dbQuery.where('meta.submitted', '==', true)
      } else if (filter === 'enrolled') {
        dbQuery = dbQuery.where('enrolled', '==', true)
      } else {
        dbQuery = dbQuery.where('meta.submitted', '==', true)
      }

      if (course && course !== 'all') {
        const classesSnapshot = await adminDb
          .collection(classesCollection)
          .where('course', '==', course)
          .get()
        const classIds = classesSnapshot.docs.map((doc) => doc.id)
        if (classIds.length === 0) {
          return {
            registrations: [],
            page: pageNum,
            limit: limitVal,
          }
        }
        dbQuery = dbQuery.where(
          'classes',
          'array-contains-any',
          classIds.slice(0, 30),
        )
      }

      dbQuery = dbQuery.orderBy('timestamps.updated', 'desc')

      // Apply pagination limit and offset
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
      console.error('[Load Error] students page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching students. Please try again later.',
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
      >(registrationsCollection, query)
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
      console.error('[Search Error] students search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
