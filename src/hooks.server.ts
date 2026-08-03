import { adminAuth } from '$lib/server/firebase'
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit'

export const handle = (async ({ event, resolve }) => {
  const sessionCookie = event.cookies.get('__session')
  let shouldRedirectToPortal = false
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie!,
      true,
    )
    const userRecord = await adminAuth.getUser(decodedClaims.uid)
    if (
      userRecord.customClaims &&
      'role' in userRecord.customClaims &&
      (userRecord.customClaims.role === 'admin' ||
        userRecord.customClaims.role === 'reviewer')
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
      shouldRedirectToPortal = true
    }
  } catch (err) {
    event.locals.user = null
  }
  // `redirect()` throws immediately, so it must be called outside the try
  // block above - otherwise the throw is caught by the surrounding
  // catch(err), which just resets locals.user and silently drops the
  // redirect instead of letting it propagate.
  if (shouldRedirectToPortal) {
    throw redirect(301, 'https://portal.gbstem.org')
  }
  return resolve(event)
}) satisfies Handle

export const handleError = (({ error }) => {
  const is404 =
    (error as any)?.status === 404 ||
    (error as any)?.message?.includes('Not found')

  if (!is404) {
    console.error('[SvelteKit Server Error]:', error)
  }

  return {
    message: (error as any)?.message || 'An unexpected error occurred.',
    code: (error as any)?.code || 'INTERNAL_ERROR',
    details: (error as any)?.stack || String(error),
  }
}) satisfies HandleServerError
