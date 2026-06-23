import { subRequestsCollection } from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { error } from '@sveltejs/kit'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'

interface DBSubRequest {
  classNumber: number
  course: string
  dateOfClass: import('firebase-admin').firestore.Timestamp
  originalInstructorEmail: string
  subInstructorId: string
  subInstructorFirstName: string
  subInstructorEmail: string
  subRequestStatus: string
  link: string
  notes: string
}

export const load = (async ({ url, depends }) => {
  depends('app:subRequests')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '25'
    const pageNum = parseInt(pageStr, 10)
    const limitVal = parseInt(limitStr, 10)
    const offsetVal = (pageNum - 1) * limitVal

    const course = url.searchParams.get('course')
    try {
      let dbQuery: Query = adminDb.collection(subRequestsCollection)

      if (course && course !== 'all') {
        dbQuery = dbQuery.where('course', '==', course)
      }

      dbQuery = dbQuery.orderBy('dateOfClass', 'desc')

      // Apply pagination limit and offset
      dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

      const snapshot = await dbQuery.get()

      return {
        page: pageNum,
        limit: limitVal,
        subRequests: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data() as DBSubRequest

          return {
            id: doc.id,
            classNumber: data.classNumber,
            course: data.course,
            dateOfClass: data.dateOfClass
              ? typeof data.dateOfClass.toDate === 'function'
                ? data.dateOfClass.toDate()
                : new Date(data.dateOfClass as any)
              : null,
            originalInstructorEmail: data.originalInstructorEmail,
            subInstructorId: data.subInstructorId,
            subInstructorFirstName: data.subInstructorFirstName,
            subInstructorEmail: data.subInstructorEmail,
            subRequestStatus: data.subRequestStatus,
            link: data.link,
            notes: data.notes,
          }
        }),
      }
    } catch (err: any) {
      console.error('[Load Error] sub-requests page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching sub requests. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    try {
      const hits = await searchIndex<DBSubRequest>(subRequestsCollection, query)
      return {
        query,
        subRequests: hits.map((hit) => {
          let dateVal: Date
          if (
            hit.dateOfClass &&
            typeof (hit.dateOfClass as any).toDate === 'function'
          ) {
            dateVal = (hit.dateOfClass as any).toDate()
          } else {
            dateVal = new Date(hit.dateOfClass as any)
          }

          return {
            id: hit.objectID,
            classNumber: hit.classNumber,
            course: hit.course,
            dateOfClass: dateVal,
            originalInstructorEmail: hit.originalInstructorEmail,
            subInstructorId: hit.subInstructorId,
            subInstructorFirstName: hit.subInstructorFirstName,
            subInstructorEmail: hit.subInstructorEmail,
            subRequestStatus: hit.subRequestStatus,
            link: hit.link,
            notes: hit.notes,
          }
        }),
      }
    } catch (err: any) {
      console.error('[Search Error] sub-requests search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
