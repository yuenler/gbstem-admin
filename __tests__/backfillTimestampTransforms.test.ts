import {
  authUidFromDocId,
  contactableEmails,
  formatIdentityEmails,
  identityFromDoc,
  timestampsNeedBackfill,
} from '../scripts/lib/backfillTimestampTransforms'

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

describe('authUidFromDocId', () => {
  it('returns an application document id unchanged', () => {
    expect(authUidFromDocId('abc123DEF456')).toBe('abc123DEF456')
  })

  it('strips the child-slot suffix from a registration document id', () => {
    expect(authUidFromDocId('abc123DEF456-1')).toBe('abc123DEF456')
    expect(authUidFromDocId('abc123DEF456-12')).toBe('abc123DEF456')
  })

  it('only strips a trailing numeric suffix', () => {
    expect(authUidFromDocId('abc-123-notaslot')).toBe('abc-123-notaslot')
  })
})

describe('identityFromDoc', () => {
  it('reads both addresses off the document and derives the auth uid', () => {
    expect(
      identityFromDoc('parentUid-2', {
        personal: {
          email: 'parent@example.com',
          secondaryEmail: 'alt@example.com',
        },
      }),
    ).toEqual({
      docId: 'parentUid-2',
      authUid: 'parentUid',
      docEmail: 'parent@example.com',
      secondaryEmail: 'alt@example.com',
      authEmail: null,
    })
  })

  it('normalizes blank, whitespace-only, and missing addresses to null', () => {
    const identity = identityFromDoc('uid1', {
      personal: { email: '   ', secondaryEmail: '' },
    })
    expect(identity.docEmail).toBeNull()
    expect(identity.secondaryEmail).toBeNull()
  })

  it('trims surrounding whitespace off an address', () => {
    expect(
      identityFromDoc('uid1', {
        personal: { email: '  parent@example.com ' },
      }).docEmail,
    ).toBe('parent@example.com')
  })

  it('survives a document with no personal block at all', () => {
    // These documents were written through a broken path, so nothing on them is
    // guaranteed to exist.
    const identity = identityFromDoc('uid1', undefined)
    expect(identity).toEqual({
      docId: 'uid1',
      authUid: 'uid1',
      docEmail: null,
      secondaryEmail: null,
      authEmail: null,
    })
  })
})

describe('formatIdentityEmails', () => {
  const base = {
    docId: 'uid1',
    authUid: 'uid1',
    docEmail: null,
    secondaryEmail: null,
    authEmail: null,
  }

  it('labels each address by source, account first', () => {
    expect(
      formatIdentityEmails({
        ...base,
        authEmail: 'account@example.com',
        docEmail: 'form@example.com',
        secondaryEmail: 'alt@example.com',
      }),
    ).toBe(
      'account account@example.com, form form@example.com, secondary alt@example.com',
    )
  })

  it('prints a repeated address once, under its first source', () => {
    expect(
      formatIdentityEmails({
        ...base,
        authEmail: 'same@example.com',
        docEmail: 'SAME@example.com',
      }),
    ).toBe('account same@example.com')
  })

  it('falls back to the form address when the account is gone', () => {
    expect(
      formatIdentityEmails({ ...base, docEmail: 'form@example.com' }),
    ).toBe('form form@example.com')
  })

  it('says so when there is no address anywhere', () => {
    expect(formatIdentityEmails(base)).toBe('(no email on document or account)')
  })
})

describe('contactableEmails', () => {
  it('lowercases every address it found, for cross-run de-duplication', () => {
    expect(
      contactableEmails({
        docId: 'uid1',
        authUid: 'uid1',
        authEmail: 'Account@Example.com',
        docEmail: 'Form@Example.com',
        secondaryEmail: null,
      }),
    ).toEqual(['account@example.com', 'form@example.com'])
  })

  it('is empty when nothing is known', () => {
    expect(
      contactableEmails({
        docId: 'uid1',
        authUid: 'uid1',
        authEmail: null,
        docEmail: null,
        secondaryEmail: null,
      }),
    ).toEqual([])
  })
})
