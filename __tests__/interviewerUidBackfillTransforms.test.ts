import {
  extractInterviewerEmail,
  interviewSlotNeedsUidBackfill,
} from '../scripts/lib/interviewerUidBackfillTransforms'

describe('interviewSlotNeedsUidBackfill', () => {
  test('returns true when interviewerUid is absent', () => {
    expect(
      interviewSlotNeedsUidBackfill({
        interviewerEmail: 'interviewer@example.com',
      }),
    ).toBe(true)
  })

  test('returns true when interviewerUid is null or undefined', () => {
    expect(interviewSlotNeedsUidBackfill({ interviewerUid: null })).toBe(true)
    expect(interviewSlotNeedsUidBackfill({ interviewerUid: undefined })).toBe(
      true,
    )
  })

  test('returns true when interviewerUid is empty or whitespace', () => {
    expect(interviewSlotNeedsUidBackfill({ interviewerUid: '' })).toBe(true)
    expect(interviewSlotNeedsUidBackfill({ interviewerUid: '   ' })).toBe(true)
  })

  test('returns true when interviewerUid is not a string', () => {
    expect(interviewSlotNeedsUidBackfill({ interviewerUid: 12345 })).toBe(true)
    expect(interviewSlotNeedsUidBackfill({ interviewerUid: {} })).toBe(true)
  })

  test('returns false when interviewerUid is already stamped with a valid string', () => {
    expect(
      interviewSlotNeedsUidBackfill({ interviewerUid: 'interviewer-uid-123' }),
    ).toBe(false)
  })

  test('returns false when data is null or undefined', () => {
    expect(interviewSlotNeedsUidBackfill(null)).toBe(false)
    expect(interviewSlotNeedsUidBackfill(undefined)).toBe(false)
  })
})

describe('extractInterviewerEmail', () => {
  test('trims and lowercases valid interviewer email', () => {
    expect(
      extractInterviewerEmail({
        interviewerEmail: '  Interviewer@Example.COM  ',
      }),
    ).toBe('interviewer@example.com')
  })

  test('returns null when interviewerEmail is missing or undefined', () => {
    expect(extractInterviewerEmail({})).toBe(null)
    expect(extractInterviewerEmail({ interviewerEmail: undefined })).toBe(null)
  })

  test('returns null when interviewerEmail is null', () => {
    expect(extractInterviewerEmail({ interviewerEmail: null })).toBe(null)
  })

  test('returns null when interviewerEmail is empty or whitespace', () => {
    expect(extractInterviewerEmail({ interviewerEmail: '' })).toBe(null)
    expect(extractInterviewerEmail({ interviewerEmail: '   \t\n  ' })).toBe(
      null,
    )
  })

  test('returns null when interviewerEmail is not a string', () => {
    expect(extractInterviewerEmail({ interviewerEmail: 12345 })).toBe(null)
    expect(extractInterviewerEmail({ interviewerEmail: ['a@b.com'] })).toBe(
      null,
    )
    expect(extractInterviewerEmail({ interviewerEmail: {} })).toBe(null)
  })

  test('returns null when data is null or undefined', () => {
    expect(extractInterviewerEmail(null)).toBe(null)
    expect(extractInterviewerEmail(undefined)).toBe(null)
  })
})
