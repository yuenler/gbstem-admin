import {
  applicationsCollection,
  classFeedbackCollection,
  classesCollection,
  currentSemester,
  decisionsCollection,
  instructorFeedbackCollection,
  interviewTimesCollection,
  registrationsCollection,
  resolveSemester,
  semesterCollectionPath,
  semesterDatesDocument,
  semesterIdFromPath,
  subRequestsCollection,
  withSemester,
} from '../src/lib/data/collections'

describe('collections.ts', () => {
  // Guards the assumption the rest of this file's assertions are built on: that
  // currentSemester is a `{Spring,Fall}{2-digit year}` id (e.g. "Spring26"), not some other
  // format. Assertions below are parameterized off currentSemester (rather than hardcoding
  // e.g. "Spring26") so they don't need editing every time a new semester rolls in — this
  // check is what keeps that parameterization honest instead of silently matching anything.
  it('currentSemester matches the expected (Spring|Fall)\\d\\d format', () => {
    expect(currentSemester).toMatch(/^(Spring|Fall)\d\d$/)
  })

  it('exports semester-scoped subcollection paths for the current semester', () => {
    expect(applicationsCollection).toBe(
      `semesters/${currentSemester}/applications`,
    )
    expect(classFeedbackCollection).toBe(
      `semesters/${currentSemester}/classFeedback`,
    )
    expect(classesCollection).toBe(`semesters/${currentSemester}/classes`)
    expect(decisionsCollection).toBe(`semesters/${currentSemester}/decisions`)
    expect(instructorFeedbackCollection).toBe(
      `semesters/${currentSemester}/instructorFeedback`,
    )
    expect(interviewTimesCollection).toBe(
      `semesters/${currentSemester}/instructorInterviewTimes`,
    )
    expect(registrationsCollection).toBe(
      `semesters/${currentSemester}/registrations`,
    )
  })

  it('leaves non-semesterized collections unchanged', () => {
    expect(semesterDatesDocument).toBe(currentSemester.toLowerCase())
    expect(subRequestsCollection).toBe('subRequests')
  })

  describe('semesterCollectionPath', () => {
    it('builds a semesters/{semesterId}/{name} path', () => {
      expect(semesterCollectionPath('Fall25', 'registrations')).toBe(
        'semesters/Fall25/registrations',
      )
    })
  })

  describe('resolveSemester', () => {
    it('returns the given id when it is a known semester', () => {
      expect(resolveSemester('Fall25')).toBe('Fall25')
    })

    it('falls back to the current semester for an unknown id', () => {
      expect(resolveSemester('NotASemester')).toBe(currentSemester)
    })

    it('falls back to the current semester for null/undefined', () => {
      expect(resolveSemester(null)).toBe(currentSemester)
      expect(resolveSemester(undefined)).toBe(currentSemester)
    })
  })

  describe('semesterIdFromPath', () => {
    it('extracts the semester id from a semester-scoped path', () => {
      expect(semesterIdFromPath('semesters/Fall25/registrations')).toBe(
        'Fall25',
      )
    })

    it('returns null for a non-semester-scoped collection', () => {
      expect(semesterIdFromPath('subRequests')).toBeNull()
    })
  })

  describe('withSemester', () => {
    it('stamps the current semester by default', () => {
      expect(withSemester({ foo: 'bar' })).toEqual({
        foo: 'bar',
        semester: currentSemester,
      })
    })

    it('stamps an explicit semester when given one', () => {
      expect(withSemester({ foo: 'bar' }, 'Fall25')).toEqual({
        foo: 'bar',
        semester: 'Fall25',
      })
    })

    it('does not mutate the original object', () => {
      const original = { foo: 'bar' }
      withSemester(original, 'Fall25')
      expect(original).toEqual({ foo: 'bar' })
    })
  })
})
