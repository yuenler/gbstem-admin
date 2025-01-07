import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import { ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY } from '$env/static/private'
import algoliasearch from 'algoliasearch'
import { instructorFeedbackCollection } from '$lib/data/collections'
import { formatClassTimes } from '$lib/utils'
import { at } from 'lodash-es'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:instructorFeedbackFall24')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const filter = url.searchParams.get('filter')
    try {
      let dbQuery;

      const collectionName = instructorFeedbackCollection
      if (filter === 'Python I' || filter === 'Python II' || filter === 'Scratch' || filter === 'Web Development' || filter === 'Engineering I' || filter === 'Engineering II' || filter === 'Engineering III' || filter === 'Math I' || filter === 'Math II' || filter === 'Math III' || filter === 'Math IV' || filter === 'Math V' || filter === 'Environmental Science'){ 
        dbQuery = adminDb
            .collection(collectionName)
            .where('courseName', '==', filter)
      } else {
        dbQuery = adminDb
        .collection(collectionName)
        .orderBy('date', 'desc')
      }

      const snapshot = await dbQuery.get()

      return {
        feedback: snapshot.docs.map((doc) => {
          const data = doc.data() as Data.InstructorFeedback

          let attendanceList: boolean[] = []

          for(var propt in data.attendanceList){
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
    } catch (err) {
      console.log(err)
      throw error(400, 'Something went wrong. Please try again later.')
    }
  } else {
    try {
      const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY)
      const index = client.initIndex(instructorFeedbackCollection)
      const { hits } = await index.search<Data.InstructorFeedback>(query)
      return {
        query,
        feedback: hits.map((hit) => {

          let attendanceList: boolean[] = []

          for(var propt in hit.attendanceList){
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
          
        }})
      }
    } catch (err) {
      throw error(400, 'The search failed. Please try again later.')
    }
  }
}) satisfies PageServerLoad
