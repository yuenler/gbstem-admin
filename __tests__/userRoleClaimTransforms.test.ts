import {
  classifyAccount,
  isKnownRole,
  needsAttention,
  roleToWrite,
  KNOWN_ROLES,
} from '../scripts/lib/userRoleClaimTransforms'

describe('isKnownRole', () => {
  it.each(KNOWN_ROLES)('accepts %s', (role) => {
    expect(isKnownRole(role)).toBe(true)
  })

  it.each([
    ['an unknown string', 'superuser'],
    ['a number', 7],
    ['null', null],
    ['undefined', undefined],
    ['an object', { role: 'admin' }],
  ])('rejects %s', (_label, value) => {
    expect(isKnownRole(value)).toBe(false)
  })
})

describe('classifyAccount', () => {
  it('reports nothing to do when claim and document agree', () => {
    expect(
      classifyAccount({ uid: 'u1', claimRole: 'student', docRole: 'student' }),
    ).toEqual({ kind: 'ok', role: 'student' })
  })

  it('plans a backfill when only the document names a role', () => {
    expect(classifyAccount({ uid: 'u1', docRole: 'instructor' })).toEqual({
      kind: 'backfill',
      role: 'instructor',
    })
  })

  it('repairs an instructor document under a student claim', () => {
    // 521 of the 522 mismatches in the first production run were this exact
    // pair, including directors and a sitting co-president - a bug from an
    // earlier era of claim handling, not tampering. These accounts are already
    // broken: portal shows them instructor pages off the document, while every
    // instructor API route refuses them off the claim.
    expect(
      classifyAccount({
        uid: 'u1',
        claimRole: 'student',
        docRole: 'instructor',
      }),
    ).toEqual({ kind: 'reconcile', from: 'student', to: 'instructor' })
  })

  it('refuses to repair a document that claims admin', () => {
    // admin and reviewer have only ever come from a signup token, so writing
    // the document value would grant privilege rather than restore it.
    expect(
      classifyAccount({ uid: 'u1', claimRole: 'student', docRole: 'admin' }),
    ).toEqual({ kind: 'divergent', claimRole: 'student', docRole: 'admin' })
  })

  it('refuses to repair a document that claims reviewer', () => {
    expect(
      classifyAccount({
        uid: 'u1',
        claimRole: 'instructor',
        docRole: 'reviewer',
      }),
    ).toEqual({
      kind: 'divergent',
      claimRole: 'instructor',
      docRole: 'reviewer',
    })
  })

  it('does not repair the reverse instructor/student direction', () => {
    // No known cause, so no known repair - it gets a human.
    expect(
      classifyAccount({
        uid: 'u1',
        claimRole: 'instructor',
        docRole: 'student',
      }),
    ).toEqual({
      kind: 'divergent',
      claimRole: 'instructor',
      docRole: 'student',
    })
  })

  it('reports a claim with no document behind it', () => {
    expect(classifyAccount({ uid: 'u1', claimRole: 'admin' })).toEqual({
      kind: 'claim-only',
      role: 'admin',
    })
  })

  it('reports an account with neither', () => {
    expect(classifyAccount({ uid: 'u1' })).toEqual({ kind: 'orphan' })
  })

  it('never copies an unrecognised document role into a claim', () => {
    expect(classifyAccount({ uid: 'u1', docRole: 'superuser' })).toEqual({
      kind: 'unknown-role',
      where: 'document',
      role: 'superuser',
    })
  })

  it('reports an unrecognised claim role', () => {
    expect(classifyAccount({ uid: 'u1', claimRole: 'superuser' })).toEqual({
      kind: 'unknown-role',
      where: 'claim',
      role: 'superuser',
    })
  })

  it('treats an empty-string role as absent', () => {
    expect(classifyAccount({ uid: 'u1', claimRole: '', docRole: '' })).toEqual({
      kind: 'orphan',
    })
  })

  it('treats a null document role as absent', () => {
    expect(
      classifyAccount({ uid: 'u1', claimRole: 'student', docRole: null }),
    ).toEqual({ kind: 'claim-only', role: 'student' })
  })
})

describe('roleToWrite', () => {
  it('writes the document role for a backfill', () => {
    expect(roleToWrite({ kind: 'backfill', role: 'student' })).toBe('student')
  })

  it('writes the repaired role for a reconcile', () => {
    expect(
      roleToWrite({ kind: 'reconcile', from: 'student', to: 'instructor' }),
    ).toBe('instructor')
  })

  it('writes nothing for anything else', () => {
    expect(roleToWrite({ kind: 'ok', role: 'student' })).toBeNull()
    expect(
      roleToWrite({
        kind: 'divergent',
        claimRole: 'student',
        docRole: 'admin',
      }),
    ).toBeNull()
    expect(roleToWrite({ kind: 'orphan' })).toBeNull()
    expect(roleToWrite({ kind: 'claim-only', role: 'admin' })).toBeNull()
    expect(
      roleToWrite({ kind: 'unknown-role', where: 'document', role: 'x' }),
    ).toBeNull()
  })
})

describe('needsAttention', () => {
  it('flags divergences and unknown roles, nothing else', () => {
    expect(
      needsAttention({
        kind: 'divergent',
        claimRole: 'student',
        docRole: 'admin',
      }),
    ).toBe(true)
    expect(
      needsAttention({ kind: 'unknown-role', where: 'document', role: 'x' }),
    ).toBe(true)
    expect(needsAttention({ kind: 'ok', role: 'admin' })).toBe(false)
    expect(needsAttention({ kind: 'backfill', role: 'admin' })).toBe(false)
    // Excluded on purpose: it is the overwhelming majority of mismatches and
    // has a known repair, so flagging it would bury the few needing a human.
    expect(
      needsAttention({ kind: 'reconcile', from: 'student', to: 'instructor' }),
    ).toBe(false)
    expect(needsAttention({ kind: 'claim-only', role: 'admin' })).toBe(false)
    expect(needsAttention({ kind: 'orphan' })).toBe(false)
  })
})
