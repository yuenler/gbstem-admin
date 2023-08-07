import { adminAuth } from '$lib/server/firebase'
import type { Handle } from '@sveltejs/kit'

export const handle = (async ({ event, resolve }) => {
  const sessionCookie = event.cookies.get('__session')
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie!,
      true,
    )
    const userRecord = await adminAuth.getUser(decodedClaims.uid)
    event.locals.user = {
      uid: userRecord.uid,
      email: userRecord.email as string,
      emailVerified: userRecord.emailVerified,
    }
  } catch (err) {
    event.locals.user = null
  }
  return resolve(event)
}) satisfies Handle
