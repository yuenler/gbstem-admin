import { adminDb } from '$lib/server/firebase'
import { error } from '@sveltejs/kit'
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'

export const load = (async ({ url, depends }) => {
  depends('app:announcements')
  const pageStr = url.searchParams.get('page') ?? '1'
  const limitStr = url.searchParams.get('limit') ?? '25'
  const pageNum = parseInt(pageStr, 10)
  const limitVal = parseInt(limitStr, 10)
  const offsetVal = (pageNum - 1) * limitVal

  try {
    let dbQuery = adminDb
      .collection('announcements')
      .orderBy('timestamp', 'desc')
    dbQuery = dbQuery.limit(limitVal).offset(offsetVal)

    const snapshot = await dbQuery.get()

    return {
      announcements: snapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data() as Data.Announcement<'server'>
        return {
          title: data.title,
          content: data.content,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        }
      }),
      page: pageNum,
      limit: limitVal,
    }
  } catch (err: any) {
    console.error('[Load Error] announcements page load:', err)
    throw error(500, {
      message:
        'Something went wrong while fetching announcements. Please try again later.',
      details: err.message || err.toString(),
      code: err.code || 'UNKNOWN',
    })
  }
}) satisfies PageServerLoad
