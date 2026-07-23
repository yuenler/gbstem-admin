import {
  LEGACY_COLLECTION_TYPES,
  compareMigratedDoc,
  deepEqualFirestoreValue,
  legacyCollectionName,
  rewriteLegacyPath,
} from '../scripts/lib/migrationTransforms'

// Minimal stand-ins for firebase-admin's Timestamp/DocumentReference, since the real
// classes require a live app connection to construct. Both are duck-typed by
// migrationTransforms.ts via an `.isEqual` method (Timestamp) or `.path` + `.isEqual`
// (DocumentReference).
class FakeTimestamp {
  constructor(public seconds: number) {}
  isEqual(other: unknown) {
    return other instanceof FakeTimestamp && other.seconds === this.seconds
  }
}

class FakeDocRef {
  constructor(public path: string) {}
  isEqual(other: unknown) {
    return other instanceof FakeDocRef && other.path === this.path
  }
}

describe('LEGACY_COLLECTION_TYPES', () => {
  it('lists exactly the 7 semesterized collection types from the plan', () => {
    expect(LEGACY_COLLECTION_TYPES).toEqual([
      'applications',
      'classFeedback',
      'classes',
      'decisions',
      'instructorFeedback',
      'instructorInterviewTimes',
      'registrations',
    ])
  })
})

describe('legacyCollectionName', () => {
  it('builds a flat {type}{semester} collection name', () => {
    expect(legacyCollectionName('applications', 'Fall25')).toBe(
      'applicationsFall25',
    )
    expect(legacyCollectionName('registrations', 'Spring26')).toBe(
      'registrationsSpring26',
    )
  })
})

describe('rewriteLegacyPath', () => {
  it('rewrites a legacy collection path to the new semester-scoped path', () => {
    expect(rewriteLegacyPath('applicationsFall25')).toBe(
      'semesters/Fall25/applications',
    )
  })

  it('rewrites a legacy document path to the new semester-scoped path', () => {
    expect(rewriteLegacyPath('decisionsFall25/uid123')).toBe(
      'semesters/Fall25/decisions/uid123',
    )
  })

  it('rewrites every known legacy collection type', () => {
    for (const type of LEGACY_COLLECTION_TYPES) {
      expect(rewriteLegacyPath(`${type}Spring24/doc1`)).toBe(
        `semesters/Spring24/${type}/doc1`,
      )
    }
  })

  it('preserves nested subpaths beyond the doc ID', () => {
    expect(rewriteLegacyPath('applicationsFall25/uid123/meta/scheduled')).toBe(
      'semesters/Fall25/applications/uid123/meta/scheduled',
    )
  })

  it('throws on a path that is not a recognized legacy collection', () => {
    expect(() => rewriteLegacyPath('subRequests')).toThrow(
      /not a recognized legacy semester-collection path/i,
    )
    expect(() => rewriteLegacyPath('users/uid123')).toThrow()
    // Already-migrated paths should not be re-rewritten silently.
    expect(() => rewriteLegacyPath('semesters/Fall25/applications')).toThrow()
  })

  it('does not match a semester suffix format it was not told about', () => {
    // Only (Spring|Fall)\d+ suffixes are recognized, matching collectionsList.json ids.
    expect(() => rewriteLegacyPath('applicationsWinter25')).toThrow()
  })
})

describe('deepEqualFirestoreValue', () => {
  it('treats equal primitives, arrays, and plain objects as equal', () => {
    expect(deepEqualFirestoreValue('a', 'a')).toBe(true)
    expect(deepEqualFirestoreValue(1, 1)).toBe(true)
    expect(deepEqualFirestoreValue([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqualFirestoreValue({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  })

  it('detects differences in primitives, arrays, and plain objects', () => {
    expect(deepEqualFirestoreValue('a', 'b')).toBe(false)
    expect(deepEqualFirestoreValue([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqualFirestoreValue({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqualFirestoreValue({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('compares Timestamp-like values via isEqual', () => {
    expect(
      deepEqualFirestoreValue(new FakeTimestamp(100), new FakeTimestamp(100)),
    ).toBe(true)
    expect(
      deepEqualFirestoreValue(new FakeTimestamp(100), new FakeTimestamp(200)),
    ).toBe(false)
  })

  it('compares DocumentReference-like values by path, not identity', () => {
    expect(
      deepEqualFirestoreValue(
        new FakeDocRef('semesters/Fall25/decisions/uid1'),
        new FakeDocRef('semesters/Fall25/decisions/uid1'),
      ),
    ).toBe(true)
    expect(
      deepEqualFirestoreValue(
        new FakeDocRef('semesters/Fall25/decisions/uid1'),
        new FakeDocRef('semesters/Fall25/decisions/uid2'),
      ),
    ).toBe(false)
  })

  it('treats null and undefined as distinct from other falsy values but equal to themselves', () => {
    expect(deepEqualFirestoreValue(null, null)).toBe(true)
    expect(deepEqualFirestoreValue(undefined, undefined)).toBe(true)
    expect(deepEqualFirestoreValue(null, undefined)).toBe(false)
    expect(deepEqualFirestoreValue(null, 0)).toBe(false)
  })

  it('recurses into nested objects/arrays', () => {
    expect(
      deepEqualFirestoreValue(
        { meta: { nested: [1, { x: 'y' }] } },
        { meta: { nested: [1, { x: 'y' }] } },
      ),
    ).toBe(true)
    expect(
      deepEqualFirestoreValue(
        { meta: { nested: [1, { x: 'y' }] } },
        { meta: { nested: [1, { x: 'z' }] } },
      ),
    ).toBe(false)
  })
})

describe('compareMigratedDoc', () => {
  it('matches when the target is the source plus a correct semester stamp', () => {
    const source = { personal: { firstName: 'Ada' }, meta: { submitted: true } }
    const target = {
      personal: { firstName: 'Ada' },
      meta: { submitted: true },
      semester: 'Fall25',
    }
    expect(compareMigratedDoc(source, target, 'Fall25')).toEqual({
      matches: true,
      mismatches: [],
    })
  })

  it('flags a wrong or missing semester stamp', () => {
    const source = { personal: { firstName: 'Ada' } }
    const target = { personal: { firstName: 'Ada' }, semester: 'Spring26' }
    const result = compareMigratedDoc(source, target, 'Fall25')
    expect(result.matches).toBe(false)
    expect(result.mismatches[0]).toMatch(/semester field/)
  })

  it('flags a value mismatch on an unrelated field', () => {
    const source = { personal: { firstName: 'Ada' } }
    const target = {
      personal: { firstName: 'Grace' },
      semester: 'Fall25',
    }
    const result = compareMigratedDoc(source, target, 'Fall25')
    expect(result.matches).toBe(false)
    expect(result.mismatches).toContain('personal: value mismatch')
  })

  it('accepts a correctly-rewritten meta.decision reference instead of requiring equality', () => {
    const source = {
      meta: { decision: new FakeDocRef('decisionsFall25/uid1') },
    }
    const target = {
      meta: { decision: new FakeDocRef('semesters/Fall25/decisions/uid1') },
      semester: 'Fall25',
    }
    expect(compareMigratedDoc(source, target, 'Fall25')).toEqual({
      matches: true,
      mismatches: [],
    })
  })

  it('flags a meta.decision reference that was rewritten to the wrong path', () => {
    const source = {
      meta: { decision: new FakeDocRef('decisionsFall25/uid1') },
    }
    const target = {
      // Wrong semester embedded in the target path (e.g. stale/incorrect rewrite)
      meta: { decision: new FakeDocRef('semesters/Spring26/decisions/uid1') },
      semester: 'Fall25',
    }
    const result = compareMigratedDoc(source, target, 'Fall25')
    expect(result.matches).toBe(false)
    expect(result.mismatches.some((m) => m.startsWith('meta.decision'))).toBe(
      true,
    )
  })

  it('treats null meta.decision on both sides as matching', () => {
    const source = { meta: { decision: null, submitted: true } }
    const target = {
      meta: { decision: null, submitted: true },
      semester: 'Fall25',
    }
    expect(compareMigratedDoc(source, target, 'Fall25')).toEqual({
      matches: true,
      mismatches: [],
    })
  })

  it('flags a decision reference present on only one side', () => {
    const source = {
      meta: { decision: new FakeDocRef('decisionsFall25/uid1') },
    }
    const target = { meta: { decision: null }, semester: 'Fall25' }
    const result = compareMigratedDoc(source, target, 'Fall25')
    expect(result.matches).toBe(false)
    expect(result.mismatches.some((m) => m.startsWith('meta.decision'))).toBe(
      true,
    )
  })
})
