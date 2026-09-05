import { db } from '$lib/client/firebase'
import {
  decisionsCollection,
  semesterCollectionPath,
  semesterIdFromPath,
  withSemester,
} from '$lib/data/collections'
import {
  buildDecisionApiPayload,
  buildFullDecisionPayload,
  buildLikelyDecisionPayload,
  buildNotesPayload,
  buildScheduleInterviewPayload,
  calculateInterviewDeadline,
  createDefaultInterviewValues,
  normalizeInterviewData,
} from '$lib/helpers/application'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { cloneDeep } from 'lodash-es'

export interface ApplicationLoadResult {
  values: Data.Application<'client'>
  decision: Data.Decision | null
  interview: Data.Interview
}

function getDecisionsCollection(viewedSemester?: string): string {
  return viewedSemester
    ? semesterCollectionPath(viewedSemester, 'decisions')
    : decisionsCollection
}

/**
 * The field groups the admin edit form owns, each `Partial` because the write is a
 * merge: the form sends only the sub-fields it renders, and Firestore merges nested
 * maps key by key. Sub-fields it deliberately doesn't render - `personal.firstName`,
 * `lastName` and `email`, which the applicant changes from their portal profile, and
 * `program.numClasses` - are therefore left untouched instead of being rewritten from
 * the dialog's stale snapshot.
 */
export type ApplicationEditableFields = {
  [K in 'personal' | 'academic' | 'program' | 'essay' | 'agreements']: Partial<
    Data.Application<'client'>[K]
  >
}

/**
 * Data Access Layer for Admin Application Review & Decision Workflows.
 */
export const applicationService = {
  /**
   * Loads an application and its attached decision document.
   */
  async loadApplicationDetails(
    appCollection: string,
    appId: string,
  ): Promise<ApplicationLoadResult> {
    const appDocRef = doc(db, appCollection, appId)
    const appSnap = await getDoc(appDocRef)

    if (!appSnap.exists()) {
      throw new Error('Application not found.')
    }

    const data = appSnap.data() as Data.Application<'client'>
    const values = cloneDeep(data)

    let decision: Data.Decision | null = null
    let interview: Data.Interview = {
      ...cloneDeep(createDefaultInterviewValues()),
      likelyDecision: null,
    }

    if (data.meta.decided) {
      // Decision docs are always keyed by the application's own id, so the path is
      // derived here rather than trusted from a stored reference field - see the
      // meta.decided writeup for why that stored-reference shape was unsafe.
      const decColl = getDecisionsCollection(
        semesterIdFromPath(appCollection) ?? undefined,
      )
      const decisionSnap = await getDoc(doc(db, decColl, appId))
      if (decisionSnap.exists()) {
        const normalized = normalizeInterviewData(
          decisionSnap.data() as Data.Interview,
        )
        decision = normalized.decision
        interview = normalized.interview
      }
    }

    return { values, decision, interview }
  },

  /**
   * Saves notes for an application's decision scorecard.
   */
  async saveNotes(
    appCollection: string,
    appId: string,
    interview: Data.Interview,
    viewedSemester?: string,
  ): Promise<void> {
    const decColl = getDecisionsCollection(viewedSemester)
    const decisionDocRef = doc(db, decColl, appId)
    await setDoc(
      decisionDocRef,
      withSemester(buildNotesPayload(interview), viewedSemester),
      { merge: true },
    )
    await updateDoc(doc(db, appCollection, appId), {
      'meta.decided': true,
    })
  },

  /**
   * Updates likely decision status for an application.
   */
  async saveLikelyDecision(
    appCollection: string,
    appId: string,
    newLikelyDecision: 'likely yes' | 'likely no' | 'likely waitlist' | null,
    currentDecision: Data.Decision | null,
    viewedSemester?: string,
  ): Promise<void> {
    const decColl = getDecisionsCollection(viewedSemester)
    const decisionDocRef = doc(db, decColl, appId)
    await setDoc(
      decisionDocRef,
      withSemester(
        buildLikelyDecisionPayload(newLikelyDecision, currentDecision),
        viewedSemester,
      ),
      { merge: true },
    )
    await updateDoc(doc(db, appCollection, appId), {
      'meta.decided': true,
    })
  },

  /**
   * Submits official decision and sends interview or decision notification email.
   */
  async submitOfficialDecision(
    appCollection: string,
    appId: string,
    newDecision: Data.Decision,
    interview: Data.Interview,
    applicantEmail: string,
    applicantFirstName: string,
    instructorOrientationDate: string,
    viewedSemester?: string,
  ): Promise<void> {
    const interviewDeadline = calculateInterviewDeadline(
      new Date(),
      instructorOrientationDate,
    )
    const updatedInterview = { ...interview, type: newDecision }
    const decColl = getDecisionsCollection(viewedSemester)
    const decisionDocRef = doc(db, decColl, appId)

    await setDoc(
      decisionDocRef,
      withSemester(buildFullDecisionPayload(updatedInterview), viewedSemester),
    )
    await updateDoc(doc(db, appCollection, appId), {
      'meta.decided': true,
    })

    try {
      // Re-fetch the application to make sure we don't get stale data from
      // a Svelte UI component.
      const appSnap = await getDoc(doc(db, appCollection, appId))
      const appData = appSnap?.exists?.()
        ? (appSnap.data() as Data.Application<'client'>)
        : null
      const email = appData?.personal?.email || applicantEmail
      const firstName = appData?.personal?.firstName || applicantFirstName

      if (newDecision === 'interview') {
        const payload = buildScheduleInterviewPayload(
          appId,
          email,
          firstName,
          interviewDeadline,
        )
        const res = await fetch('/api/scheduleInterview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          console.warn(
            'Failed to send interview scheduling email:',
            res.statusText,
          )
        }
      } else {
        const payload = buildDecisionApiPayload(
          newDecision,
          appId,
          email,
          firstName,
        )
        const res = await fetch('/api/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          console.warn(
            'Failed to send decision notification email:',
            res.statusText,
          )
        }
      }
    } catch (emailErr) {
      console.warn('Email notification request failed:', emailErr)
    }
  },

  /**
   * Saves edited application field values (personal/academic/program/essay/agreements).
   *
   * Takes only the fields the edit form actually owns and merges them in, rather
   * than a full application object - the edit dialog loads `values` once when it
   * opens and can go stale relative to concurrent writes (e.g. a backfill script,
   * the applicant saving their own form in the portal, or another admin action).
   * A full `setDoc()` from that stale snapshot would silently revert whatever
   * those writers changed; merging only the edited fields can't.
   */
  async saveApplicationDetails(
    appCollection: string,
    appId: string,
    editedFields: ApplicationEditableFields,
    viewedSemester?: string,
  ): Promise<void> {
    await setDoc(
      doc(db, appCollection, appId),
      withSemester(editedFields, viewedSemester),
      { merge: true },
    )
  },

  /**
   * Bulk-assigns a decision to multiple applications, links each to its decision document,
   * and sends decision or interview notification emails.
   */
  async bulkSetDecision(
    applicationIds: string[],
    appCollection: string,
    decisionsColl: string,
    decision: Data.Decision,
    viewedSemester?: string,
    instructorOrientationDate?: string,
  ): Promise<void> {
    const interviewDeadline = instructorOrientationDate
      ? calculateInterviewDeadline(new Date(), instructorOrientationDate)
      : ''

    await Promise.all(
      applicationIds.map(async (id) => {
        const decisionDocRef = doc(db, decisionsColl, id)
        await setDoc(
          decisionDocRef,
          withSemester({ type: decision }, viewedSemester),
        )
        await updateDoc(doc(db, appCollection, id), {
          'meta.decided': true,
        })

        try {
          const appSnap = await getDoc(doc(db, appCollection, id))
          if (appSnap.exists()) {
            const data = appSnap.data() as Data.Application<'client'>
            const applicantEmail = data.personal?.email
            const applicantFirstName = data.personal?.firstName

            if (applicantEmail && applicantFirstName) {
              if (decision === 'interview') {
                const payload = buildScheduleInterviewPayload(
                  id,
                  applicantEmail,
                  applicantFirstName,
                  interviewDeadline,
                )
                await fetch('/api/scheduleInterview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })
              } else {
                const payload = buildDecisionApiPayload(
                  decision,
                  id,
                  applicantEmail,
                  applicantFirstName,
                )
                await fetch('/api/decision', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })
              }
            }
          }
        } catch (emailErr) {
          console.warn('Bulk email notification request failed:', emailErr)
        }
      }),
    )
  },
}
