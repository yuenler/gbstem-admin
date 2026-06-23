import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import type { Timestamp } from 'firebase-admin/firestore'

export const load: PageServerLoad = async ({ params }) => {
  try {
    const hhid = await adminDb.collection('hhids').doc(params.slug).get()
    if (!hhid.exists) {
      throw error(404, 'Applicant not found.')
    }
    const hhidData = hhid.data() as {
      checkedIn: boolean
      checkedInAt: Timestamp
      food: Record<string, Record<string, boolean>>
    }
    const query = await adminDb
      .collection('users')
      .where('hhid', '==', params.slug)
      .get()
    const confirmedDoc = await adminDb
      .collection('confirmations')
      .doc(query.docs[0].id)
      .get()
    return {
      applicant: {
        confirmed: confirmedDoc.exists,
        hhid: {
          checkedIn: hhidData.checkedIn,
          checkedInAt: (hhidData.checkedInAt as Timestamp)?.toDate(),
          food: hhidData.food,
        },
        user: query.docs[0].data(),
      },
    }
  } catch (err: any) {
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      throw err
    }
    console.error('[Load Error] user details page load:', err)
    throw error(500, {
      message: 'Failed to load applicant details from database.',
      details: err.message || err.toString(),
      code: err.code || 'UNKNOWN',
    })
  }
}
