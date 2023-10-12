import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import type { Timestamp } from 'firebase-admin/firestore'

export const load: PageServerLoad = async ({ params }) => {
  const hhid = await adminDb.collection('hhids').doc(params.slug).get()
  if (!hhid.exists) {
    throw error(404, 'Applicant not found.')
  }
  const hhidData = hhid.data() as {
    checkedIn: boolean
    checkedInAt: Timestamp
    food: {
      '2023-10-20': {
        dinner: boolean
      }
      '2023-10-21': {
        breakfast: boolean
        lunch: boolean
        dinner: boolean
      }
      '2023-10-22': {
        breakfast: boolean
      }
    }
  }
  const query = await adminDb
    .collection('users')
    .where('hhid', '==', params.slug)
    .get()
  return {
    applicant: {
      hhid: {
        checkedIn: hhidData.checkedIn,
        checkedInAt: (hhidData.checkedInAt as Timestamp)?.toDate(),
        food: hhidData.food,
      },
      user: query.docs[0].data(),
    },
  }
}
