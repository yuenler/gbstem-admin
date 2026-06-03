import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'

export const load = (async ({ depends, locals, url }) => {
  if (locals.user && locals.user.role === 'admin') {
    depends('app:tokens')
    const pageStr = url.searchParams.get('page') ?? '1'
    const limitStr = url.searchParams.get('limit') ?? '25'
    const pageNum = parseInt(pageStr, 10)
    const limitVal = parseInt(limitStr, 10)
    const offsetVal = (pageNum - 1) * limitVal
    try {
      let dbQuery = adminDb.collection('tokens').orderBy('expires', 'desc')
      dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

      const snapshot = await dbQuery.get()
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
        page: pageNum,
        limit: limitVal,
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
