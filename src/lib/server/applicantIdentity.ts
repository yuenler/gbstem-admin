import { adminAuth } from '$lib/server/firebase'

/**
 * Resolves an applicant's current email from Auth by uid.
 *
 * Applications are keyed by the applicant's Auth uid, so the caller always has
 * one to hand - `fallbackEmail` is the `personal.email` the applicant typed on
 * their application form, which goes stale as soon as they change their account
 * address. It stays only for browser sessions loaded before the uid migration,
 * and every use is logged as `[legacy-email-fallback]` so the counter can be
 * watched to zero before the parameter is deleted - see
 * notes/EMAIL_TO_UID_AUDIT.md sections 7 and 8.
 *
 * Returns undefined when neither source yields an address, leaving the caller
 * to decide the status code.
 */
export async function resolveApplicantEmail(
  applicantUid: string | undefined,
  fallbackEmail: string | undefined,
  route: string,
): Promise<string | undefined> {
  if (!applicantUid) {
    if (fallbackEmail) {
      console.warn(
        `[legacy-email-fallback] ${route}: no applicantUid in payload, ` +
          `using the client-supplied applicant email`,
      )
    }
    return fallbackEmail
  }
  try {
    const user = await adminAuth.getUser(applicantUid)
    if (user.email) return user.email
    console.warn(
      `[legacy-email-fallback] ${route}: applicantUid ${applicantUid} has no ` +
        `email on its Auth account`,
    )
    return fallbackEmail
  } catch (err) {
    console.error(
      'Failed to resolve applicant email by uid, falling back to the application address:',
      err,
    )
    return fallbackEmail
  }
}
