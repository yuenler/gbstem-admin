// Pure classification logic for scripts/backfill-user-role-claims.ts.
//
// Kept out of the script itself so it can be unit tested without Auth or
// Firestore - see __tests__/userRoleClaimTransforms.test.ts and the "Helpers,
// Services, and Where New Code Should Go" section of the README.

/**
 * The role values the two sites accept today.
 *
 * Deliberately a runtime list rather than a reference to `Data.Role`: that
 * type is ambient, differs between this repo and portal (see the note in
 * src/data.d.ts), and erases at compile time, so it cannot vet a string that
 * came out of Firestore. Phase 2's instructor split adds its values here.
 */
export const KNOWN_ROLES = [
  'admin',
  'reviewer',
  'instructor',
  'student',
] as const

export type KnownRole = (typeof KNOWN_ROLES)[number]

export function isKnownRole(value: unknown): value is KnownRole {
  return (
    typeof value === 'string' &&
    (KNOWN_ROLES as readonly string[]).includes(value)
  )
}

export type AccountRoles = {
  uid: string
  email?: string
  /** `customClaims.role` from the Auth record, if any. */
  claimRole?: unknown
  /** `users/{uid}.role`, if the document exists and carries one. */
  docRole?: unknown
}

export type Verdict =
  /** Claim and document already agree. Nothing to do. */
  | { kind: 'ok'; role: KnownRole }
  /** No claim yet, but the document names a role we recognise: set the claim. */
  | { kind: 'backfill'; role: KnownRole }
  /**
   * Claim and document name *different* roles. Never repaired automatically:
   * with the role written once at signup and nowhere else, a divergence means
   * the document was edited afterwards - which is exactly the escalation this
   * migration closes. Someone should look at these before they are touched.
   */
  | { kind: 'divergent'; claimRole: string; docRole: string }
  /**
   * A claim but no document role. Harmless - the claim is what authorizes -
   * but reported because it usually means a half-finished signup.
   */
  | { kind: 'claim-only'; role: KnownRole }
  /** A role string neither site knows. Reported, never propagated to a claim. */
  | { kind: 'unknown-role'; where: 'claim' | 'document'; role: string }
  /** Neither a claim nor a document role: the account can't sign in anywhere. */
  | { kind: 'orphan' }

/**
 * Decides what, if anything, an account needs.
 *
 * The ordering matters: an unrecognised role is reported wherever it appears
 * rather than being copied into a claim, and a divergence outranks a backfill
 * because the interesting case is the one where both exist and disagree.
 */
export function classifyAccount(account: AccountRoles): Verdict {
  const { claimRole, docRole } = account
  const hasClaim =
    claimRole !== undefined && claimRole !== null && claimRole !== ''
  const hasDoc = docRole !== undefined && docRole !== null && docRole !== ''

  if (hasClaim && !isKnownRole(claimRole)) {
    return { kind: 'unknown-role', where: 'claim', role: String(claimRole) }
  }
  if (hasDoc && !isKnownRole(docRole)) {
    return { kind: 'unknown-role', where: 'document', role: String(docRole) }
  }

  if (hasClaim && hasDoc) {
    return claimRole === docRole
      ? { kind: 'ok', role: claimRole as KnownRole }
      : {
          kind: 'divergent',
          claimRole: String(claimRole),
          docRole: String(docRole),
        }
  }
  if (hasClaim) return { kind: 'claim-only', role: claimRole as KnownRole }
  if (hasDoc) return { kind: 'backfill', role: docRole as KnownRole }
  return { kind: 'orphan' }
}

/** Whether a verdict warrants a write. Only `backfill` ever does. */
export function needsWrite(verdict: Verdict): verdict is {
  kind: 'backfill'
  role: KnownRole
} {
  return verdict.kind === 'backfill'
}

/**
 * Whether a verdict is something a human should look at. `ok` is silent;
 * everything else is either a change or an anomaly.
 */
export function needsAttention(verdict: Verdict): boolean {
  return verdict.kind === 'divergent' || verdict.kind === 'unknown-role'
}
