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
    // New slot requests will have a UID, but legacy ones may not, and in that case
    // we parse it out of the ${intervieweeUid}-${dateToAdd} format document ID.
    uid: data.uid || id.replace(/-\d{4}-\d{2}-\d{2}.*$/, ''),
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
  // Send uids only. The server resolves both addresses from Auth, so a stored
  // email that has since gone stale can't misdirect the mail. The two email
  // fields are still sent, but only when the slot has no uid to send instead -
  // some pre-migration slots never recorded an intervieweeId, and dropping the
  // address outright would turn a working email into a 400. The server logs
  // each such request as `[legacy-email-fallback]`; once that reads zero, Phase
  // 4 deletes these branches and makes both uids required.
  return {
    intervieweeUid: slot.intervieweeId || undefined,
    ...(slot.intervieweeId
      ? {}
      : { intervieweeEmail: slot.intervieweeEmail || '' }),
    firstName: slot.intervieweeFirstName || '',
    interviewer: slot.interviewerName || '',
    interviewerUid: slot.interviewerUid || undefined,
    ...(slot.interviewerUid ? {} : { email: slot.interviewerEmail || '' }),
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
  interviewerUid: string = '',
): Data.InterviewSlot {
  return getInterviewSlotDefaults(
    interviewerName,
    interviewerEmail,
    interviewerUid,
  )
}

/**
 * True when `slot` belongs to the signed-in user: matched by uid, falling
 * back to email if uid is missing. Stored email is unreliable because the
 * interviewer could change their email later, so code should avoid using it;
 * it is retained as a permanent record if an account is deleted, though fallback is rare.
 */
export function isOwnInterviewSlot(
  slot: Pick<Data.InterviewSlot, 'interviewerEmail' | 'interviewerUid'>,
  userEmail?: string | null,
  userUid?: string | null,
): boolean {
  if (slot.interviewerUid) {
    return slot.interviewerUid === userUid
  }
  return slot.interviewerEmail === userEmail
}

/**
 * Checks whether a user has permissions to modify a given interview slot.
 */
export function canUserModifySlot(
  slot: Pick<Data.InterviewSlot, 'interviewerEmail' | 'interviewerUid'>,
  userEmail?: string | null,
  userUid?: string | null,
  userRole?: string | null,
): boolean {
  return isOwnInterviewSlot(slot, userEmail, userUid) || userRole === 'admin'
}

/**
 * Maps an interview slot into superform-compatible values.
 *
 * `id` is deliberately absent: `interviewSlotSchema` doesn't describe it and
 * `generateInterviewSlotId` produces it at write time, so it is carried
 * alongside the form data rather than through it.
 *
 * Same hazard as the other forms' mappers - a schema field missing here shows
 * the schema's default instead of the stored value, and both slot writes are
 * `setDoc` with no `{ merge: true }`, so that default is then stored.
 */
export function toInterviewSlotFormValues(slot: Data.InterviewSlot) {
  return {
    date: slot.date || '',
    meetingLink: slot.meetingLink || '',
    interviewerName: slot.interviewerName || '',
    interviewerEmail: slot.interviewerEmail || '',
    interviewerUid: slot.interviewerUid || '',
    intervieweeFirstName: slot.intervieweeFirstName || '',
    intervieweeLastName: slot.intervieweeLastName || '',
    intervieweeEmail: slot.intervieweeEmail || '',
    intervieweeId: slot.intervieweeId || '',
    interviewSlotStatus: slot.interviewSlotStatus || ('available' as const),
  }
}
