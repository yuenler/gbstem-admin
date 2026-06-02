import { instructorFeedbackCollection } from '$lib/data/collections'
import { adminDb } from '$lib/server/firebase'
import { searchIndex } from '$lib/server/search'
import { error } from '@sveltejs/kit'
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'
// import { db } from '$lib/client/firebase'

interface DBInstructorFeedback {
  instructorName: string
  students: string[]
  attendanceList: Record<string, { present: boolean }>
  date: string
  courseName: string
  feedback: string
  classNumber: number
}

export const load = (async ({ url, depends }) => {
  depends('app:instructorFeedbackFall24')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const filter = url.searchParams.get('filter')
    try {
      let dbQuery: Query

      const collectionName = instructorFeedbackCollection
      if (
        filter === 'Python I' ||
        filter === 'Python II' ||
        filter === 'Scratch' ||
        filter === 'Web Development' ||
        filter === 'Engineering I' ||
        filter === 'Engineering II' ||
        filter === 'Engineering III' ||
        filter === 'Math I' ||
        filter === 'Math II' ||
        filter === 'Math III' ||
        filter === 'Math IV' ||
        filter === 'Math V' ||
        filter === 'Environmental Science'
      ) {
        dbQuery = adminDb
          .collection(collectionName)
          .where('courseName', '==', filter)
      } else {
        dbQuery = adminDb.collection(collectionName).orderBy('date', 'desc')
      }

      const snapshot = await dbQuery.get()

      return {
        feedback: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data() as DBInstructorFeedback

          const attendanceList: boolean[] = []

          for (const propt in data.attendanceList) {
            attendanceList.push(data.attendanceList[propt].present)
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

          for (const propt in hit.attendanceList) {
            attendanceList.push(hit.attendanceList[propt].present)
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
