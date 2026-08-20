// Pure, Firestore-connection-free transform logic for the timestamps.created backfill
// (scripts/backfill-created-timestamp.ts). Kept in its own module, with no import-time
// side effects, so it can be unit tested without an emulator/production connection.
//
// Background: registration and application documents created through the portal's
// student-facing forms had timestamps.created hardcoded to null in
// createEmptyRegistration/createEmptyApplication, and no write path ever replaced it with
// a real timestamp - every save only ever stamped timestamps.updated. That's now fixed in
// the portal repo (RegistrationForm.svelte / ApplyForm.svelte self-heal timestamps.created
// on their next save), but documents that won't be saved again by their owner (submitted,
// enrolled, decided) stay broken until backfilled here. This module decides which documents
// still need that backfill.

// Whether a document's timestamps.created is a real Firestore Timestamp (as opposed to
// null, missing, or the pre-fix `null as any` default that was actually written to
// Firestore). A Timestamp is the only shape with a `.toDate` method, so that's what we
// check instead of comparing against a specific bad value.
export function timestampsNeedBackfill(
  timestamps: Record<string, any> | undefined,
): boolean {
  return !timestamps || typeof timestamps.created?.toDate !== 'function'
}
