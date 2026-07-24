// Pure, Firestore-connection-free transform logic for the semester migration
// (scripts/migrate-semesters.ts). Kept in its own module, with no import-time
// side effects, so it can be unit tested without an emulator/production connection.

// The 7 collection types duplicated per semester under the legacy schema
// (`{type}{Semester}`, e.g. `applicationsSpring26`). See
// SEMESTER_MIGRATION_PLAN.md § 1/§ 4.
export const LEGACY_COLLECTION_TYPES = [
  'applications',
  'classFeedback',
  'classes',
  'decisions',
  'instructorFeedback',
  'instructorInterviewTimes',
  'registrations',
] as const

export type LegacyCollectionType = (typeof LEGACY_COLLECTION_TYPES)[number]

// Builds a legacy flat collection name, e.g. legacyCollectionName('applications', 'Fall25')
// -> 'applicationsFall25'.
export const legacyCollectionName = (
  type: LegacyCollectionType,
  semesterId: string,
): string => `${type}${semesterId}`

const LEGACY_PATH_RE = new RegExp(
  `^(${LEGACY_COLLECTION_TYPES.join('|')})((?:Spring|Fall)\\d+)(/.*)?$`,
)

// Rewrites a legacy collection or document path to its new semester-scoped subcollection
// path: `{type}{Semester}` -> `semesters/{Semester}/{type}`, and
// `{type}{Semester}/{docId}` -> `semesters/{Semester}/{type}/{docId}`. This is the one
// transform used for both (a) computing each document's migration target path and
// (b) rewriting `meta.decision` DocumentReference paths (§ 4) — same shape of path, same
// rewrite. Throws on input that isn't a recognized legacy semester-collection path, since a
// silent pass-through here would risk migrating data to the wrong place.
export function rewriteLegacyPath(legacyPath: string): string {
  const match = legacyPath.match(LEGACY_PATH_RE)
  if (!match) {
    throw new Error(
      `Not a recognized legacy semester-collection path: "${legacyPath}"`,
    )
  }
  const [, type, semesterId, rest] = match
  return `semesters/${semesterId}/${type}${rest ?? ''}`
}

// Firestore Timestamp/GeoPoint/DocumentReference-like values all carry an `.isEqual` method
// on the real SDK types; duck-typing on it (rather than importing firebase-admin's classes)
// keeps this module import-side-effect-free and usable from Jest without a live connection.
function hasIsEqual(
  value: unknown,
): value is { isEqual(other: unknown): boolean } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).isEqual === 'function'
  )
}

function isDocumentReferenceLike(
  value: unknown,
): value is { path: string; isEqual(other: unknown): boolean } {
  return hasIsEqual(value) && typeof (value as any).path === 'string'
}

// Deep-equality for two Firestore document values, used by --verify to compare a source doc
// against its migrated target. Deliberately field-order-independent for plain objects, and
// treats DocumentReference-like values as equal if their `.path`s match (rather than
// requiring reference identity), since --verify compares a *rewritten* reference against
// what the transform *should* have produced, not the original.
export function deepEqualFirestoreValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b
  }
  if (isDocumentReferenceLike(a) && isDocumentReferenceLike(b)) {
    return a.path === b.path
  }
  if (hasIsEqual(a) && typeof b === 'object') {
    // Timestamps, GeoPoints
    try {
      return a.isEqual(b)
    } catch {
      return false
    }
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    return a.every((val, i) => deepEqualFirestoreValue(val, b[i]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object)
    const bKeys = Object.keys(b as object)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((key) =>
      deepEqualFirestoreValue((a as any)[key], (b as any)[key]),
    )
  }
  return false
}

// Compares a migrated target doc against its legacy source doc, field-by-field, ignoring the
// two fields the migration is *expected* to change: the added `semester` stamp, and
// `meta.decision` (checked structurally via decisionRefPathsMatch instead, since a plain
// deep-equal would always fail on it — the whole point of that field is that it changes).
export function compareMigratedDoc(
  sourceData: Record<string, any>,
  targetData: Record<string, any>,
  semesterId: string,
): { matches: boolean; mismatches: string[] } {
  const mismatches: string[] = []

  if (targetData.semester !== semesterId) {
    mismatches.push(
      `semester field: expected "${semesterId}", got "${targetData.semester}"`,
    )
  }

  const sourceKeys = new Set(Object.keys(sourceData))
  const targetKeys = new Set(Object.keys(targetData))
  targetKeys.delete('semester') // added by the migration, not present on the source

  for (const key of new Set([...sourceKeys, ...targetKeys])) {
    if (key === 'meta') {
      const sourceMeta = sourceData.meta ?? {}
      const targetMeta = targetData.meta ?? {}
      for (const metaKey of new Set([
        ...Object.keys(sourceMeta),
        ...Object.keys(targetMeta),
      ])) {
        if (metaKey === 'decision') {
          const sourceDecision = sourceMeta.decision
          const targetDecision = targetMeta.decision
          if (sourceDecision == null || targetDecision == null) {
            if (sourceDecision !== targetDecision) {
              mismatches.push(
                `meta.decision: expected ${sourceDecision == null ? 'null' : 'a reference'}, got ${targetDecision == null ? 'null' : 'a reference'}`,
              )
            }
            continue
          }
          const expectedPath = rewriteLegacyPath(sourceDecision.path)
          if (targetDecision.path !== expectedPath) {
            mismatches.push(
              `meta.decision: expected path "${expectedPath}", got "${targetDecision.path}"`,
            )
          }
          continue
        }
        if (
          !deepEqualFirestoreValue(sourceMeta[metaKey], targetMeta[metaKey])
        ) {
          mismatches.push(`meta.${metaKey}: value mismatch`)
        }
      }
      continue
    }
    if (!deepEqualFirestoreValue(sourceData[key], targetData[key])) {
      mismatches.push(`${key}: value mismatch`)
    }
  }

  return { matches: mismatches.length === 0, mismatches }
}
