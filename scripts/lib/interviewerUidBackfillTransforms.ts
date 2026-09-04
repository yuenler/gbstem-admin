// interviewerUidBackfillTransforms.ts - Pure transform logic for backfilling
// interviewerUid on interview slot documents (scripts/backfill-interviewer-uids.ts).
// Kept in its own module without side effects so it can be unit tested without
// connecting to Firestore or Auth emulators.

/**
 * Checks if an interview slot document needs its `interviewerUid` backfilled.
 *
 * A slot needs backfill if `interviewerUid` is absent, not a string, or empty/whitespace-only.
 * Slots that already have a valid non-empty `interviewerUid` are skipped for idempotency.
 */
export function interviewSlotNeedsUidBackfill(
  data: Record<string, unknown> | null | undefined,
): boolean {
  if (!data) return false
  return (
    typeof data.interviewerUid !== 'string' ||
    data.interviewerUid.trim().length === 0
  )
}

/**
 * Extracts and normalizes the `interviewerEmail` from an interview slot document.
 *
 * Returns a lowercased, trimmed email string if present and non-empty;
 * returns null if the field is missing, not a string, or blank.
 */
export function extractInterviewerEmail(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data || typeof data.interviewerEmail !== 'string') return null
  const email = data.interviewerEmail.trim().toLowerCase()
  return email.length > 0 ? email : null
}
