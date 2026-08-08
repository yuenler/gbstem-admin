import {
  applicationNeedsBackfill,
  computeDecided,
  registrationNeedsBackfill,
} from '../scripts/lib/backfillTransforms'

// Minimal stand-in for firebase-admin's DocumentReference, since the real class requires
// a live app connection to construct.
class FakeDocRef {
  constructor(public path: string) {}
}

describe('computeDecided', () => {
  it('is true for a real DocumentReference', () => {
    expect(
      computeDecided(new FakeDocRef('semesters/Fall25/decisions/app-1')),
    ).toBe(true)
  })

  it('is true for the injection-payload shape (a plain string)', () => {
    expect(computeDecided('tokens/some-token-id')).toBe(true)
  })

  it('is false for null, undefined, or missing', () => {
    expect(computeDecided(null)).toBe(false)
    expect(computeDecided(undefined)).toBe(false)
  })
})

describe('applicationNeedsBackfill', () => {
  it('is false for a document with no meta', () => {
    expect(applicationNeedsBackfill(undefined)).toBe(false)
  })

  it('is false for an already-backfilled document (decided set, no decision field)', () => {
    expect(applicationNeedsBackfill({ decided: true })).toBe(false)
    expect(applicationNeedsBackfill({ decided: false })).toBe(false)
  })

  it('needs backfill when meta.decided is missing', () => {
    expect(
      applicationNeedsBackfill({
        decision: new FakeDocRef('semesters/Fall25/decisions/app-1'),
      }),
    ).toBe(true)
    expect(applicationNeedsBackfill({ decision: null })).toBe(true)
  })

  it('needs backfill when meta.decided disagrees with meta.decision', () => {
    expect(
      applicationNeedsBackfill({
        decided: false,
        decision: new FakeDocRef('semesters/Fall25/decisions/app-1'),
      }),
    ).toBe(true)
    expect(applicationNeedsBackfill({ decided: true, decision: null })).toBe(
      true,
    )
  })

  it('needs backfill to strip a legacy decision field even if decided already agrees', () => {
    // A document that was already correctly backfilled for meta.decided but still
    // carries the stale meta.decision field (e.g. a partially-applied prior run).
    expect(
      applicationNeedsBackfill({
        decided: true,
        decision: new FakeDocRef('semesters/Fall25/decisions/app-1'),
      }),
    ).toBe(true)
  })
})

describe('registrationNeedsBackfill', () => {
  it('is false for a document with no meta', () => {
    expect(registrationNeedsBackfill(undefined)).toBe(false)
  })

  it('is false for a normal registration with no decision field', () => {
    expect(registrationNeedsBackfill({ uid: 'u1', submitted: true })).toBe(
      false,
    )
  })

  it('needs backfill when a stray meta.decision field is present (the injection payload)', () => {
    expect(
      registrationNeedsBackfill({
        uid: 'u1',
        submitted: true,
        decision: 'tokens/some-token-id',
      }),
    ).toBe(true)
  })
})
