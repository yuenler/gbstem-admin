import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import { ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY } from '$env/static/private'
import algoliasearch from 'algoliasearch'
import { formatTime24to12 } from '$lib/utils'
// import { db } from '$lib/client/firebase'

function formatClassTimes(
    classDays: string[],
    classTimes: string[],
  ): string[] {
    return classDays.map(
      (day, index) => `${day} at ${formatTime24to12(classTimes[index])}`,
    )
  }

export const load = (async ({ url, depends }) => {
  depends('app:classes')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const filter = url.searchParams.get('filter')
    try {
      let dbQuery;

      const collectionName = 'classesSpring24'
      if (filter === 'Python I') {
        dbQuery = adminDb
            .collection(collectionName)
            .where('course', '==', 'Python I')
      }
      else if (filter === 'Python II'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Python II')
      } else if (filter === 'Scratch'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Scratch')
      } else if (filter === 'Web Development'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Web Development')
      } else if (filter === 'Engineering I'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Engineering I')
      } else if (filter === 'Engineering II'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Engineering II')
      } else if (filter === 'Engineering III'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Engineering III')
      } else if (filter === 'Math I'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Math I')
      } else if (filter === 'Math II'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Math II')
      } else if (filter === 'Math III'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Math III')
      } else if (filter === 'Math IV'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Math IV')
      } else if (filter === 'Math V'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Math IV')
      } else if (filter === 'Environmental Science'){
        dbQuery = adminDb
        .collection(collectionName)
        .where('course', '==', 'Math IV')
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
            classes: Array.of(data.course),
            students: data.students,
            meetingLink: data.meetingLink,
            classesStatus: data.classesStatus,
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
      const index = client.initIndex('classesSpring24')
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
            classes: Array.of(hit.course),
            students: hit.students,
            classesStatus: hit.classesStatus,
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
