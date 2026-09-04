// Pure, Firestore-connection-free transform logic for the co-instructor uid
// backfill (scripts/backfill-other-instructor-uids.ts). Kept in its own module,
// with no import-time side effects, so it can be unit tested without an
// emulator/production connection.
//
// Background: a class used to record its co-instructors as
// `otherInstructorEmails`, a free-text comma-separated string the class owner
// typed by hand. firestore.rules's isInstructorOfClass() honoured that string
// directly, so typing any address at all into the class details form granted
// that person write access to the class - with no check that they were ever
// interviewed, accepted, or even a gbSTEM user. gbSTEM leadership's rule is
// that nobody teaches a class they weren't assigned and accepted for, so
// co-instructors are now stored as `otherInstructorUids` only, and a uid gets
// there only after the server confirms the account is an accepted instructor.
//
// This module decides what a pre-existing class document should end up with;
// the script itself does the Auth and decision lookups that can't be pure.

/**
 * Splits a legacy `otherInstructorEmails` value into individual addresses.
 *
 * Deliberately permissive about separators. The field was free text, so real
 * documents contain commas, semicolons, newlines and bare spaces in whatever
 * combination the owner typed - and an address that fails to parse here is an
 * address that silently loses its access, so this errs toward recovering one.
 * Non-string values (the field absent, or null) yield nothing.
 */
export function parseLegacyOtherInstructorEmails(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0),
    ),
  ]
}

/**
 * Whether a class document still has co-instructor work outstanding.
 *
 * `dropLegacyField` is the second of the backfill's two phases. In phase one
 * a document needs a write only if it has legacy addresses that haven't been
 * turned into uids yet; the string itself is deliberately left in place so
 * that app code still running the old build keeps working. In phase two, any
 * document that still carries the string needs a write to remove it.
 */
export function classNeedsCoInstructorBackfill(
  data: Record<string, unknown>,
  options: { dropLegacyField: boolean },
): boolean {
  const hasLegacyField = typeof data.otherInstructorEmails === 'string'
  if (options.dropLegacyField && hasLegacyField) return true
  return parseLegacyOtherInstructorEmails(data.otherInstructorEmails).length > 0
}

/**
 * Merges newly resolved uids into whatever the document already had.
 *
 * A union rather than a replacement, and order-stable: some classes were
 * already saved by a build that wrote `otherInstructorUids` alongside the
 * string, and re-running the backfill must not reorder or drop those. This is
 * what makes the script idempotent.
 */
export function mergeCoInstructorUids(
  existing: string[] | undefined,
  resolved: string[],
): string[] {
  return [...new Set([...(existing ?? []), ...resolved])]
}
