import { instructorFeedbackCollection } from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { error } from '@sveltejs/kit'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'

interface DBInstructorFeedback {
  instructorName: string
  students: string[]
  attendanceList:
    | Record<string, { present: boolean }>
    | Array<{ present: boolean }>
  date: string
  courseName: string
  feedback: string
  classNumber: number
}

export const load = (async ({ url, depends, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'You do not have permission to view this page.')
  }
  depends('app:instructorFeedbackFall24')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '25'
    const pageNum = parseInt(pageStr, 10)
    const limitVal = parseInt(limitStr, 10)
    const offsetVal = (pageNum - 1) * limitVal

    const course = url.searchParams.get('course')
    try {
      let dbQuery: Query = adminDb.collection(instructorFeedbackCollection)

      if (course && course !== 'all') {
        dbQuery = dbQuery.where('courseName', '==', course)
      }

      dbQuery = dbQuery.orderBy('date', 'desc')

      // Apply pagination limit and offset
      dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

      const snapshot = await dbQuery.get()

      return {
        page: pageNum,
        limit: limitVal,
        feedback: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data() as DBInstructorFeedback

          const attendanceList: boolean[] = []
          if (data.attendanceList) {
            if (Array.isArray(data.attendanceList)) {
              for (const entry of data.attendanceList) {
                attendanceList.push(entry.present)
              }
            } else {
              for (const propt in data.attendanceList) {
                attendanceList.push(data.attendanceList[propt].present)
              }
            }
          }

          return {
            id: doc.id,
            instructorName: data.instructorName,
            courseName: data.courseName,
            students: data.students,
            feedback: data.feedback,
            date: data.date,
            attendanceList: attendanceList,
            classNumber: data.classNumber,
          }
        }),
      }
    } catch (err: any) {
      console.error('[Load Error] instructor-feedback page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching instructor feedback. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    try {
      const hits = await searchIndex<DBInstructorFeedback>(
        instructorFeedbackCollection,
        query,
      )
      return {
        query,
        feedback: hits.map((hit) => {
          const attendanceList: boolean[] = []
          if (hit.attendanceList) {
            if (Array.isArray(hit.attendanceList)) {
              for (const entry of hit.attendanceList) {
                attendanceList.push(entry.present)
              }
            } else {
              for (const propt in hit.attendanceList) {
                attendanceList.push(hit.attendanceList[propt].present)
              }
            }
          }

          return {
            id: hit.objectID,
            instructorName: hit.instructorName,
            courseName: hit.courseName,
            students: hit.students,
            feedback: hit.feedback,
            date: hit.date,
            attendanceList: attendanceList,
            classNumber: hit.classNumber,
          }
        }),
      }
    } catch (err: any) {
      console.error('[Search Error] instructor-feedback search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
