import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'

export const load = (async ({ depends, locals }) => {
  if (locals.user && locals.user.role === 'admin') {
    depends('app:tokens')
    try {
      const snapshot = await adminDb.collection('tokens').get()
      return {
        tokens: snapshot.docs.map((doc) => {
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
    } catch (err) {
      throw error(400, 'Something went wrong. Please try again later.')
    }
  } else {
    throw error(400, 'You do not have permission to view this page.')
  }
}) satisfies PageServerLoad
