import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import { ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY } from '$env/static/private'
import algoliasearch from 'algoliasearch'
import { classesCollection } from '$lib/data/collections'
import { formatClassTimes } from '$lib/utils'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:classes')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const filter = url.searchParams.get('filter')
    try {
      let dbQuery;

      const collectionName = classesCollection
      if (filter === 'Python I' || filter === 'Python II' || filter === 'Scratch' || filter === 'Web Development' || filter === 'Engineering I' || filter === 'Engineering II' || filter === 'Engineering III' || filter === 'Math I' || filter === 'Math II' || filter === 'Math III' || filter === 'Math IV' || filter === 'Math V' || filter === 'Environmental Science'){ 
        dbQuery = adminDb
            .collection(collectionName)
            .where('course', '==', filter)
      } else {
        dbQuery = adminDb
        .collection(collectionName)
        .orderBy('course')
      }

      const snapshot = await dbQuery.get()

      return {
        classes: snapshot.docs.map((doc) => {
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
      }
    } catch (err) {
      console.log(err)
      throw error(400, 'Something went wrong. Please try again later.')
    }
  } else {
    try {
      const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY)
      const index = client.initIndex(classesCollection)
      const { hits } = await index.search<
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
      >(query)
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
          
        }})
      }
    } catch (err) {
      throw error(400, 'The search failed. Please try again later.')
    }
  }
}) satisfies PageServerLoad
