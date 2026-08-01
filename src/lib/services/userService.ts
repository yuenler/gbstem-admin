import { db } from '$lib/client/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

/**
 * Service providing Data Access Layer for user account records.
 *
 * `users/{uid}` is the canonical home for a person's name on both sites; the
 * Auth `displayName` is a derived convenience (it's what Firebase itself shows
 * in emails and the console). Keep the two in step whenever a name changes.
 */
export const userService = {
  /**
   * Reads the stored name for an account, or null when the account has no
   * `users` document. Accounts created before signup started writing one
   * legitimately have no document, so callers must handle null.
   */
  async fetchUserName(
    uid: string,
  ): Promise<{ firstName: string; lastName: string } | null> {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) {
      return null
    }
    const data = snap.data()
    return {
      firstName: data?.firstName ?? '',
      lastName: data?.lastName ?? '',
    }
  },

  /**
   * Updates a user's name fields, creating the document if it's missing.
   * `setDoc`+merge rather than `updateDoc` on purpose: admins created before
   * signup wrote a `users` document would otherwise get a `not-found` error
   * and be permanently unable to rename themselves.
   */
  async updateUserName(
    uid: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    await setDoc(
      doc(db, 'users', uid),
      { firstName, lastName },
      { merge: true },
    )
  },
}
