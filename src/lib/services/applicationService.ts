import { db } from '$lib/client/firebase'
import {
  decisionsCollection,
  semesterCollectionPath,
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
 * Data Access Layer for Admin Application Review & Decision Workflows.
 */
export const applicationService = {
  /**
   * Loads an application and its attached decision document.
   */
  async loadApplicationDetails(
    appCollection: string,
    appId: string,
    defaultValues: Data.Application<'client'>,
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

    if (data.meta.decision) {
      const decisionSnap = await getDoc(data.meta.decision)
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
      'meta.decision': decisionDocRef,
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
    interview: Data.Interview,
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
      'meta.decision': decisionDocRef,
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
      'meta.decision': decisionDocRef,
    })

    try {
      if (newDecision === 'interview') {
        const payload = buildScheduleInterviewPayload(
          applicantEmail,
          applicantFirstName,
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
          applicantEmail,
          applicantFirstName,
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
}
