import { adminDb } from '$lib/server/firebase'
import { parsePagination } from '$lib/utils'
import { error } from '@sveltejs/kit'
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { PageServerLoad } from './$types'

export const load = (async ({ url, depends }) => {
  depends('app:announcements')
  const { pageNum, limitVal, offsetVal } = parsePagination(url)

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
