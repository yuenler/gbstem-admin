import { classFeedbackCollection } from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { error } from '@sveltejs/kit'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'

interface DBStudentFeedback {
  instructor: string
  studentName: string
  feedback: string
  rating: number
  course: string
  date: string
}

export const load = (async ({ url, depends }) => {
  depends('app:studentFeedback')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '25'
    const pageNum = parseInt(pageStr, 10)
    const limitVal = parseInt(limitStr, 10)
    const offsetVal = (pageNum - 1) * limitVal

    const course = url.searchParams.get('course')
    try {
      let dbQuery: Query = adminDb.collection(classFeedbackCollection)

      if (course && course !== 'all') {
        dbQuery = dbQuery.where('course', '==', course)
      }

      dbQuery = dbQuery.orderBy('date', 'desc')

      // Apply pagination limit and offset
      dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

      const snapshot = await dbQuery.get()

      return {
        page: pageNum,
        limit: limitVal,
        feedback: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data() as DBStudentFeedback

          return {
            id: doc.id,
            instructorName: data.instructor,
            studentName: data.studentName,
            feedback: data.feedback,
            rating: data.rating,
            course: data.course,
            date: data.date,
          }
        }),
      }
    } catch (err: any) {
      console.error('[Load Error] student-feedback page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching student feedback. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    try {
      const hits = await searchIndex<DBStudentFeedback>(
        classFeedbackCollection,
        query,
      )
      return {
        query,
        feedback: hits.map((hit) => {
          return {
            id: hit.objectID,
            instructorName: hit.instructor,
            studentName: hit.studentName,
            feedback: hit.feedback,
            rating: hit.rating,
            course: hit.course,
            date: hit.date,
          }
        }),
      }
    } catch (err: any) {
      console.error('[Search Error] student-feedback search load:', err)
      throw error(500, {
        message: 'The search failed. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  }
}) satisfies PageServerLoad
