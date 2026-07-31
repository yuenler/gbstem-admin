import { db } from '$lib/client/firebase'
import {
  currentSemester,
  registrationsCollection,
  semesterIdFromPath,
  withSemester,
} from '$lib/data/collections'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

/**
 * Service providing Data Access Layer for Admin Registration review & editing.
 */
export const registrationService = {
  /**
   * Fetches a single registration document from the given (possibly semester-scoped) collection.
   */
  async fetchRegistration(
    collectionPath: string,
    registrationId: string,
  ): Promise<Data.Registration<'client'> | null> {
    const snap = await getDoc(doc(db, collectionPath, registrationId))
    if (!snap.exists()) {
      return null
    }
    return snap.data() as Data.Registration<'client'>
  },

  /**
   * Saves edited registration field values, stamped with the semester derived from `collectionPath`.
   */
  async saveRegistration(
    collectionPath: string,
    registrationId: string,
    updatedValues: Data.Registration<'client'>,
  ): Promise<void> {
    await setDoc(
      doc(db, collectionPath, registrationId),
      withSemester(
        updatedValues,
        semesterIdFromPath(collectionPath) ?? currentSemester,
      ),
    )
  },

  /**
   * Toggles a registration's `agreements.bypassAgeLimits` flag.
   *
   * Note: this always targets the current semester's registrations collection,
   * regardless of which semester is being viewed - this mirrors pre-existing
   * behavior rather than deriving the semester from a caller-provided path.
   */
  async toggleBypassAgeLimits(registrationId: string): Promise<void> {
    const registrationDocRef = doc(db, registrationsCollection, registrationId)
    const snap = await getDoc(registrationDocRef)
    if (!snap.exists()) {
      return
    }
    await updateDoc(registrationDocRef, {
      'agreements.bypassAgeLimits': !snap.data().agreements.bypassAgeLimits,
    })
  },
}
