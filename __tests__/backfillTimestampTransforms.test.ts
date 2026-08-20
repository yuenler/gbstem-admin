import { timestampsNeedBackfill } from '../scripts/lib/backfillTimestampTransforms'

// Minimal stand-in for firebase-admin's Timestamp, since the real class requires a live
// app connection to construct.
class FakeTimestamp {
  constructor(
    public seconds: number,
    public nanoseconds: number,
  ) {}
  toDate() {
    return new Date(this.seconds * 1000)
  }
}

describe('timestampsNeedBackfill', () => {
  it('is false when timestamps.created is a real Timestamp', () => {
    expect(
      timestampsNeedBackfill({
        created: new FakeTimestamp(1000, 0),
        updated: new FakeTimestamp(2000, 0),
      }),
    ).toBe(false)
  })

  it('needs backfill when timestamps is missing entirely', () => {
    expect(timestampsNeedBackfill(undefined)).toBe(true)
  })

  it('needs backfill when timestamps.created is null (the pre-fix default)', () => {
    expect(
      timestampsNeedBackfill({
        created: null,
        updated: new FakeTimestamp(2000, 0),
      }),
    ).toBe(true)
  })

  it('needs backfill when timestamps.created is missing but timestamps.updated is set', () => {
    expect(
      timestampsNeedBackfill({ updated: new FakeTimestamp(2000, 0) }),
    ).toBe(true)
  })
})
