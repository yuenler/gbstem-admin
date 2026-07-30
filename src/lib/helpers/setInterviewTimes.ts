import { getInterviewSlotDefaults } from '$lib/components/forms/schemas'
import { formatDateLocal, toLocalISOString } from '$lib/utils'
import type {} from '../../data.d.ts'
import type { AssignInterviewRequestBody } from '../../routes/api/assignInterview/+server'

/**
 * Parses raw Firestore document data into a Data.InterviewSlot object.
 */
export function parseInterviewSlotDoc(
  id: string,
  data: any,
): Data.InterviewSlot | null {
  if (!data || !data.date) return null
  const timestampSeconds =
    data.date.seconds ??
    (data.date instanceof Date ? data.date.getTime() / 1000 : 0)
  return {
    ...data,
    date: toLocalISOString(new Date(timestampSeconds * 1000)),
    id,
  } as Data.InterviewSlot
}

/**
 * Parses raw Firestore document data into a Data.SlotRequest object.
 */
export function parseSlotRequestDoc(
  id: string,
  data: any,
): Data.SlotRequest | null {
  if (!data || !data.date) return null
  const timestampSeconds =
    data.date.seconds ??
    (data.date instanceof Date ? data.date.getTime() / 1000 : 0)
  return {
    date: new Date(timestampSeconds * 1000),
    id,
    uid: id.replace(/-\d{4}-\d{2}-\d{2}.*$/, ''),
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    email: data.email ?? '',
  }
}

/**
 * Sorts slot requests chronologically by date.
 */
export function sortSlotRequestsByDate(
  requests: Data.SlotRequest[],
): Data.SlotRequest[] {
  return [...requests].sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Filters and extracts submitted applicant options and names who have not yet been interviewed.
 */
export function filterEligibleInterviewees(docs: any[]): {
  names: { name: string }[]
  options: Data.Application<'client'>[]
} {
  const names: { name: string }[] = []
  const options: Data.Application<'client'>[] = []

  docs.forEach((docSnap) => {
    const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap
    const docId = docSnap.id ?? data.id ?? ''
    if (
      data &&
      data.meta &&
      data.meta.interview === false &&
      data.meta.submitted === true
    ) {
      const fullName =
        `${data.personal?.firstName ?? ''} ${data.personal?.lastName ?? ''}`.trim()
      names.push({ name: fullName })
      options.push({ ...data, docId } as any)
    }
  })

  names.sort((a, b) => a.name.localeCompare(b.name))
  return { names, options }
}

/**
 * Generates a unique slot ID based on date and user UID.
 */
export function generateInterviewSlotId(dateISO: string, uid?: string): string {
  const time = new Date(dateISO).getTime()
  return `${time}${uid ?? ''}`
}

/**
 * Constructs request payload for /api/assignInterview endpoint.
 */
export function buildAssignInterviewApiPayload(
  slot: Data.InterviewSlot,
): AssignInterviewRequestBody {
  return {
    intervieweeEmail: slot.intervieweeEmail || '',
    firstName: slot.intervieweeFirstName || '',
    interviewer: slot.interviewerName || '',
    email: slot.interviewerEmail || '',
    link: slot.meetingLink || '',
    date: formatDateLocal(slot.date),
  }
}

/**
 * Generates clean default Data.InterviewSlot object.
 */
export function resetInterviewSlotToAdd(
  interviewerName: string = '',
  interviewerEmail: string = '',
): Data.InterviewSlot {
  return getInterviewSlotDefaults(interviewerName, interviewerEmail)
}

/**
 * Checks whether a user has permissions to modify a given interview slot.
 */
export function canUserModifySlot(
  slotInterviewerEmail: string,
  userEmail?: string | null,
  userRole?: string | null,
): boolean {
  return slotInterviewerEmail === userEmail || userRole === 'admin'
}
