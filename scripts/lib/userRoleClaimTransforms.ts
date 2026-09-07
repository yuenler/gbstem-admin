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
   * The known-bad pair: an `instructor` document under a `student` claim.
   *
   * This was originally treated as a tamper signal, on the reasoning that the
   * role is written once at signup so a mismatch meant the document was edited
   * afterwards. The first production run disproved that - 521 of 522
   * divergences were this exact pair, including directors and a sitting
   * co-president. A self-promoting attacker population would be small and
   * varied; 521 identical rows is a bug, from the era of claim handling that
   * predates portal's current /api/auth.
   *
   * These accounts are *already broken*, not merely inconsistent. Portal's UI
   * reads the role from the document (so they see instructor pages) while
   * `verifyInstructor` reads the claim (so every instructor API route answers
   * "Only instructors can do that"). Repairing the claim fixes that, and is
   * also what stops the new rules - which read only the claim - from taking
   * instructor access away from 521 real instructors on deploy day.
   *
   * Safe to repair automatically only because teaching access is now gated on
   * the decision document rather than the role: an `instructor` claim with no
   * accepted decision grants applicant-level access and nothing more, which is
   * what anyone gets by signing up as an instructor anyway. Were the role
   * still the gate, this would be handing out 521 sets of student PII.
   */
  | { kind: 'reconcile'; from: KnownRole; to: KnownRole }
  /**
   * Any other disagreement between claim and document. Never repaired
   * automatically - notably a document naming `admin` or `reviewer` under a
   * lesser claim, where writing the document's value would *grant* privilege
   * rather than restore it. Those roles have only ever come from a signup
   * token, so a document claiming one is not evidence the account should have
   * it.
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
    if (claimRole === docRole) {
      return { kind: 'ok', role: claimRole as KnownRole }
    }
    // Deliberately the one narrow pair, in one direction, rather than a
    // general "the document wins" rule: it is the only mismatch with a known
    // cause, and the only one where writing the document's value restores
    // access the account already has rather than granting it something new.
    if (claimRole === 'student' && docRole === 'instructor') {
      return { kind: 'reconcile', from: 'student', to: 'instructor' }
    }
    return {
      kind: 'divergent',
      claimRole: String(claimRole),
      docRole: String(docRole),
    }
  }
  if (hasClaim) return { kind: 'claim-only', role: claimRole as KnownRole }
  if (hasDoc) return { kind: 'backfill', role: docRole as KnownRole }
  return { kind: 'orphan' }
}

/** The role a verdict says to write, or null when it calls for no write. */
export function roleToWrite(verdict: Verdict): KnownRole | null {
  if (verdict.kind === 'backfill') return verdict.role
  if (verdict.kind === 'reconcile') return verdict.to
  return null
}

/**
 * Whether a verdict is something a human has to decide about. `reconcile` is
 * deliberately excluded - it has a known cause and a known repair, and after
 * the first production run it is the overwhelming majority of mismatches, so
 * treating it as an anomaly would bury the handful that are.
 */
export function needsAttention(verdict: Verdict): boolean {
  return verdict.kind === 'divergent' || verdict.kind === 'unknown-role'
}
