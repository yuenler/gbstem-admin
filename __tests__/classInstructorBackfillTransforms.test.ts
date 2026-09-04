import {
  classNeedsCoInstructorBackfill,
  classNeedsInstructorUidBackfill,
  instructorUidFromClassId,
  mergeCoInstructorUids,
  parseLegacyOtherInstructorEmails,
} from '../scripts/lib/classInstructorBackfillTransforms'

describe('parseLegacyOtherInstructorEmails', () => {
  // The field was free text, so real documents hold whatever the class owner
  // typed. An address this fails to recover is an address whose owner
  // silently loses access to a class they teach, so it errs toward parsing.
  test('splits on commas, semicolons, and whitespace alike', () => {
    expect(
      parseLegacyOtherInstructorEmails(
        'ada@example.com, bob@example.com;carol@example.com  dave@example.com',
      ),
    ).toEqual([
      'ada@example.com',
      'bob@example.com',
      'carol@example.com',
      'dave@example.com',
    ])
  })

  test('trims, lowercases, and drops empty tokens', () => {
    expect(
      parseLegacyOtherInstructorEmails('  ADA@Example.COM ,, bob@example.com,'),
    ).toEqual(['ada@example.com', 'bob@example.com'])
  })

  test('deduplicates an address listed twice', () => {
    expect(
      parseLegacyOtherInstructorEmails('ada@example.com, ADA@example.com'),
    ).toEqual(['ada@example.com'])
  })

  test('yields nothing for a missing or non-string field', () => {
    expect(parseLegacyOtherInstructorEmails(undefined)).toEqual([])
    expect(parseLegacyOtherInstructorEmails(null)).toEqual([])
    expect(parseLegacyOtherInstructorEmails('')).toEqual([])
    expect(parseLegacyOtherInstructorEmails(['a@b.com'])).toEqual([])
  })
})

describe('classNeedsCoInstructorBackfill', () => {
  const phase1 = { dropLegacyField: false }
  const phase2 = { dropLegacyField: true }

  test('phase 1 picks up a document with legacy addresses', () => {
    expect(
      classNeedsCoInstructorBackfill(
        { otherInstructorEmails: 'ada@example.com' },
        phase1,
      ),
    ).toBe(true)
  })

  // Phase 1 deliberately leaves the string alone so old app builds keep
  // working, so an empty string is nothing to do rather than a write.
  test('phase 1 skips a document whose legacy field is empty', () => {
    expect(
      classNeedsCoInstructorBackfill({ otherInstructorEmails: '' }, phase1),
    ).toBe(false)
  })

  test('phase 1 skips a document that never had the field', () => {
    expect(
      classNeedsCoInstructorBackfill(
        { otherInstructorUids: ['uid-ada'] },
        phase1,
      ),
    ).toBe(false)
  })

  // Phase 2 exists to remove the string, so even an empty one needs a write.
  test('phase 2 picks up any document still carrying the field', () => {
    expect(
      classNeedsCoInstructorBackfill({ otherInstructorEmails: '' }, phase2),
    ).toBe(true)
  })

  test('phase 2 skips a document already cleaned up', () => {
    expect(
      classNeedsCoInstructorBackfill(
        { otherInstructorUids: ['uid-ada'] },
        phase2,
      ),
    ).toBe(false)
  })
})

describe('mergeCoInstructorUids', () => {
  // Some classes were already saved by a build that wrote both fields, so a
  // re-run must not reorder or drop what is already there. This is what makes
  // the script safe to run twice.
  test('unions with what the document already had, preserving order', () => {
    expect(mergeCoInstructorUids(['uid-ada'], ['uid-grace'])).toEqual([
      'uid-ada',
      'uid-grace',
    ])
  })

  test('does not duplicate a uid present on both sides', () => {
    expect(mergeCoInstructorUids(['uid-ada'], ['uid-ada'])).toEqual(['uid-ada'])
  })

  test('handles a document with no uids array yet', () => {
    expect(mergeCoInstructorUids(undefined, ['uid-ada'])).toEqual(['uid-ada'])
    expect(mergeCoInstructorUids(undefined, [])).toEqual([])
  })
})

describe('instructorUidFromClassId', () => {
  // The portal names a class `${uid}-${n}`, and firestore.rules only lets an
  // instructor create one under their own uid - so the ID is a record of who
  // owns the class that, unlike the stored email, can't go stale.
  test('strips the trailing class number to expose the owning uid', () => {
    expect(instructorUidFromClassId('abc123XYZ-1')).toBe('abc123XYZ')
    expect(instructorUidFromClassId('abc123XYZ-42')).toBe('abc123XYZ')
  })

  // Firebase-generated uids are 28 alphanumeric characters, but an explicitly
  // set uid may contain anything - every uid in scripts/seed.ts is hyphenated.
  // Rejecting those on shape would fail on exactly the accounts this is meant
  // to recognise, so the caller confirms the candidate against Auth instead.
  test('keeps a hyphenated uid intact', () => {
    expect(instructorUidFromClassId('instructor-demo-uid-98')).toBe(
      'instructor-demo-uid',
    )
  })

  test('declines an ID with no trailing class number', () => {
    expect(instructorUidFromClassId('class-python1')).toBe(null)
    expect(instructorUidFromClassId('abc123')).toBe(null)
    expect(instructorUidFromClassId('')).toBe(null)
  })

  // `class-fake-6` yields the candidate "class-fake", which is not an account.
  // That is fine and deliberate: this function proposes, Auth disposes.
  test('proposes a candidate it cannot itself validate', () => {
    expect(instructorUidFromClassId('class-fake-6')).toBe('class-fake')
  })
})

describe('classNeedsInstructorUidBackfill', () => {
  test('is true when the field is absent', () => {
    expect(
      classNeedsInstructorUidBackfill({ instructorEmail: 'a@b.com' }),
    ).toBe(true)
  })

  // Documents written before the field existed omit it, but a few paths
  // default it to '' - neither is a usable owner.
  test('is true when the field is an empty string', () => {
    expect(classNeedsInstructorUidBackfill({ instructorUid: '' })).toBe(true)
  })

  test('is false once a uid is stamped', () => {
    expect(classNeedsInstructorUidBackfill({ instructorUid: 'uid-ada' })).toBe(
      false,
    )
  })
})
