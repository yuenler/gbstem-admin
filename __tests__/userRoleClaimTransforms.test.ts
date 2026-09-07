import {
  classifyAccount,
  isKnownRole,
  needsAttention,
  needsWrite,
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

  it('flags a divergence rather than repairing it', () => {
    // The tamper signal: role is written once at signup and nowhere else, so
    // a document that disagrees with the claim was edited afterwards.
    expect(
      classifyAccount({
        uid: 'u1',
        claimRole: 'student',
        docRole: 'instructor',
      }),
    ).toEqual({
      kind: 'divergent',
      claimRole: 'student',
      docRole: 'instructor',
    })
  })

  it('flags a divergence even when the document claims admin', () => {
    expect(
      classifyAccount({ uid: 'u1', claimRole: 'student', docRole: 'admin' }),
    ).toEqual({ kind: 'divergent', claimRole: 'student', docRole: 'admin' })
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

describe('needsWrite', () => {
  it('is true only for a backfill', () => {
    expect(needsWrite({ kind: 'backfill', role: 'student' })).toBe(true)
    expect(needsWrite({ kind: 'ok', role: 'student' })).toBe(false)
    expect(
      needsWrite({ kind: 'divergent', claimRole: 'student', docRole: 'admin' }),
    ).toBe(false)
    expect(needsWrite({ kind: 'orphan' })).toBe(false)
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
    expect(needsAttention({ kind: 'claim-only', role: 'admin' })).toBe(false)
    expect(needsAttention({ kind: 'orphan' })).toBe(false)
  })
})
