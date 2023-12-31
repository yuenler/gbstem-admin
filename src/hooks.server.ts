import { adminAuth } from '$lib/server/firebase'
import { redirect, type Handle } from '@sveltejs/kit'

export const handle = (async ({ event, resolve }) => {
  const sessionCookie = event.cookies.get('__session')
  let topRedirect
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie!,
      true,
    )
    const userRecord = await adminAuth.getUser(decodedClaims.uid)
    if (
      userRecord.customClaims &&
      'role' in userRecord.customClaims &&
      userRecord.customClaims.role !== 'applicant'
    ) {
      const { role } = userRecord.customClaims as { role: Data.Role }
      event.locals.user = {
        uid: userRecord.uid,
        email: userRecord.email as string,
        emailVerified: userRecord.emailVerified,
        role,
      }
    } else {
      event.locals.user = null
      topRedirect = redirect(301, 'https://portal.gbstem.org')
    }
  } catch (err) {
    event.locals.user = null
  }
  if (topRedirect !== undefined) {
    throw topRedirect
  }
  return resolve(event)
}) satisfies Handle
