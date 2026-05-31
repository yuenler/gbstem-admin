import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'

export const load = (async ({ depends, locals }) => {
  if (locals.user && locals.user.role === 'admin') {
    depends('app:tokens')
    try {
      const snapshot = await adminDb.collection('tokens').get()
      return {
        tokens: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data() as Data.Token<'server'>
          return {
            id: doc.id,
            values: {
              ...data,
              expires: data.expires.toDate(),
            } as Data.Token<'pojo'>,
          }
        }),
      }
    } catch (err: any) {
      console.error('[Load Error] tokens page load:', err)
      throw error(500, {
        message:
          'Something went wrong while fetching tokens. Please try again later.',
        details: err.message || err.toString(),
        code: err.code || 'UNKNOWN',
      })
    }
  } else {
    throw error(400, 'You do not have permission to view this page.')
  }
}) satisfies PageServerLoad
