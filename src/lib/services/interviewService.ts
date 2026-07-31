import { db } from '$lib/client/firebase'
import {
  applicationsCollection,
  interviewTimesCollection,
  withSemester,
} from '$lib/data/collections'
import {
  buildAssignInterviewApiPayload,
  filterEligibleInterviewees,
  generateInterviewSlotId,
  parseInterviewSlotDoc,
  parseSlotRequestDoc,
  sortSlotRequestsByDate,
} from '$lib/helpers/setInterviewTimes'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

/**
 * Service providing Data Access Layer for Interview Slots and Slot Requests.
 */
export const interviewService = {
  /**
   * Fetches all interview slots from Firestore.
   */
  async fetchInterviewSlots(): Promise<Data.InterviewSlot[]> {
    const interviewSlots: Data.InterviewSlot[] = []
    const q = query(collection(db, interviewTimesCollection))
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((docSnap) => {
      const slot = parseInterviewSlotDoc(docSnap.id, docSnap.data())
      if (slot) {
        interviewSlots.push(slot)
      }
    })
    return interviewSlots
  },

  /**
   * Fetches all slot requests from Firestore sorted by date.
   */
  async fetchSlotRequests(): Promise<Data.SlotRequest[]> {
    const slotRequests: Data.SlotRequest[] = []
    const q = query(collection(db, 'interviewTimeRequests'))
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((docSnap) => {
      const req = parseSlotRequestDoc(docSnap.id, docSnap.data())
      if (req) {
        slotRequests.push(req)
      }
    })
    return sortSlotRequestsByDate(slotRequests)
  },

  /**
   * Fetches all applicant options eligible for interviews.
   */
  async fetchEligibleInterviewees(): Promise<{
    names: { name: string }[]
    options: Data.Application<'client'>[]
  }> {
    const q = query(collection(db, applicationsCollection))
    const querySnapshot = await getDocs(q)
    return filterEligibleInterviewees(querySnapshot.docs)
  },

  /**
   * Creates or assigns an interview slot in Firestore and calls API if assigned.
   */
  async createOrAssignInterviewSlot(
    slotToAdd: Data.InterviewSlot,
    selectedIntervieweeDocId?: string,
    userUid?: string,
  ): Promise<Data.InterviewSlot> {
    const slotId = generateInterviewSlotId(slotToAdd.date, userUid)
    const finalSlot = { ...slotToAdd, id: slotId }

    await setDoc(
      doc(db, interviewTimesCollection, finalSlot.id),
      withSemester({
        ...finalSlot,
        date: new Date(finalSlot.date),
      }),
    )

    if (finalSlot.intervieweeId && selectedIntervieweeDocId) {
      await updateDoc(
        doc(db, applicationsCollection, selectedIntervieweeDocId),
        {
          'meta.interview': true,
        },
      )

      const payload = buildAssignInterviewApiPayload(finalSlot)
      const res = await fetch('/api/assignInterview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error('Failed to send interview assignment email')
      }
    }

    return finalSlot
  },

  /**
   * Updates an existing interview slot's date and meeting link in Firestore.
   */
  async updateInterviewSlot(interview: Data.InterviewSlot): Promise<void> {
    await setDoc(
      doc(db, interviewTimesCollection, interview.id),
      withSemester({
        ...interview,
        date: new Date(interview.date),
      }),
    )
  },

  /**
   * Deletes an interview slot from Firestore.
   */
  async deleteInterviewSlot(slotId: string): Promise<void> {
    await deleteDoc(doc(db, interviewTimesCollection, slotId))
  },
}
