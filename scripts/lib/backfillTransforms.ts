// Pure, Firestore-connection-free transform logic for the meta.decided backfill
// (scripts/backfill-decided.ts). Kept in its own module, with no import-time side
// effects, so it can be unit tested without an emulator/production connection.
//
// Background: applications used to carry meta.decision, a DocumentReference (or null)
// pointing at the record's decision doc. Firestore doesn't enforce that field's type on
// write, and firestore.rules lets the owning applicant write their whole document, so an
// attacker could set meta.decision to an arbitrary path string instead of a real
// reference - and server code that trusted it as a reference (adminDb.doc(decision).get())
// would read whatever document that string pointed to, bypassing every security rule.
// meta.decided (a plain boolean) replaces it: it can't be used to construct a path, and
// the actual decision doc is now always looked up deterministically at
// semesters/{id}/decisions/{applicationId} instead of via a stored pointer. This module
// computes what meta.decided should be for a pre-existing document, and whether that
// document still needs a write to get there.

// Whether an application doc's legacy meta.decision value represents a real, recorded
// decision. meta.decision could be a DocumentReference (the intended shape), a plain
// string (the injection payload meta.decided exists to eliminate), or missing/null (no
// decision yet) - any truthy value means "a decision was recorded".
export function computeDecided(metaDecision: unknown): boolean {
  return Boolean(metaDecision)
}

// Whether an application document's meta needs a backfill write. A legacy meta.decision
// field always needs a write (to compute meta.decided from it and remove it) regardless
// of what meta.decided currently holds - once that field is gone, there's nothing left to
// re-derive meta.decided from, so a doc with no meta.decision only still needs a write if
// meta.decided was never set at all (undefined, not merely false).
export function applicationNeedsBackfill(
  meta: Record<string, any> | undefined,
): boolean {
  if (!meta) return false
  if ('decision' in meta) return true
  return meta.decided === undefined
}

// Registrations never legitimately had a meta.decision field (decisions are an
// applications-only concept - see the admin registrations/students page server code,
// which never wrote one). Any meta.decision found there can only be leftover from the
// injection vulnerability itself and should just be removed, with no meta.decided to set.
export function registrationNeedsBackfill(
  meta: Record<string, any> | undefined,
): boolean {
  if (!meta) return false
  return 'decision' in meta
}
