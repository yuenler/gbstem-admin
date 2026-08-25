import { classesCollection } from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { formatClassTimes, parsePagination } from '$lib/utils'
import { error } from '@sveltejs/kit'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:classes')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const { pageNum, limitVal, offsetVal } = parsePagination(url)

    const filter = url.searchParams.get('filter')
    try {
      let dbQuery: Query

      const collectionName = classesCollection
      if (filter && filter !== 'all') {
        dbQuery = adminDb
          .collection(collectionName)
          .where('course', '==', filter)
          .orderBy('course')
      } else {
        dbQuery = adminDb.collection(collectionName).orderBy('course')
      }

      dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

      const snapshot = await dbQuery.get()

      return {
        classes: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data() as Data.Class

          return {
            id: doc.id,
            name: data.instructorFirstName + ' ' + data.instructorLastName,
            email: data.instructorEmail,
            courses: Array.of(data.course),
            students: data.students,
            meetingLink: data.meetingLink,
            classStatuses: data.classStatuses,
            classTimes: formatClassTimes(
              [data.classDay1, data.classDay2],
              [data.classTime1, data.classTime2],
            ),
          }
        }),
        page: pageNum,
        limit: limitVal,
      }
    } catch (err: any) {
      console.error('[Load Error] classes page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching classes. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    try {
      const hits = await searchIndex<
        Omit<Data.Class, 'classCap' | 'meetingTimes' | 'feedbackCompleted'> & {
          meta: {
            id: string
            uid: string
            submitted: boolean
            decision: string | null
          }
          timestamps: {
            updated: Date
            created: Date
          }
        }
      >(classesCollection, query)
      return {
        query,
        classes: hits.map((hit) => {
          return {
            id: hit.objectID,
            name: hit.instructorFirstName + ' ' + hit.instructorLastName,
            email: hit.instructorEmail,
            courses: Array.of(hit.course),
            students: hit.students,
            classStatuses: hit.classStatuses,
            meetingLink: hit.meetingLink,
            classTimes: formatClassTimes(
              [hit.classDay1, hit.classDay2],
              [hit.classTime1, hit.classTime2],
            ),
          }
        }),
      }
    } catch (err: any) {
      console.error('[Search Error] classes search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
