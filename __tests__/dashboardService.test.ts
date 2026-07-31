import { dashboardService } from '$lib/services/dashboardService'
import * as firestore from 'firebase/firestore'
import type {} from '../src/data.d.ts'

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDocs: jest.fn(),
  getCountFromServer: jest.fn(),
}))

function mockSnapshot(docs: any[]) {
  return { forEach: (cb: any) => docs.forEach(cb), size: docs.length }
}

function mockCount(count: number) {
  return { data: () => ({ count }) }
}

function mockDoc(id: string, data: Record<string, any>) {
  return { id, data: () => data }
}

describe('dashboardService (Data Access Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('fetchDashboardData (reviewer view)', () => {
    it('aggregates application counts and uncompleted applicant emails, leaving registration/user data zeroed', async () => {
      ;(firestore.getDocs as jest.Mock).mockResolvedValueOnce(
        mockSnapshot([
          mockDoc('app-1', { personal: { email: 'a@example.com' } }),
          mockDoc('app-2', { personal: {} }),
        ]),
      )
      ;(firestore.getCountFromServer as jest.Mock)
        .mockResolvedValueOnce(mockCount(10))
        .mockResolvedValueOnce(mockCount(8))
        .mockResolvedValueOnce(mockCount(5))

      const result = await dashboardService.fetchDashboardData(true)

      expect(result.dashboardData).toEqual({
        applications: {
          total: 10,
          submitted: 8,
          decided: 5,
          registered: 0,
          totalRegistrationsStarted: 0,
          enrolled: 0,
        },
        users: { total: 0 },
      })
      expect(result.classesToday).toEqual([])
      expect(result.uncompletedRegistrationsEmails).toEqual([])
      expect(result.uncompletedApplicationsEmails).toEqual(['a@example.com'])
    })

    it('skips applicant docs without a usable email', async () => {
      ;(firestore.getDocs as jest.Mock).mockResolvedValueOnce(
        mockSnapshot([mockDoc('app-1', { personal: { email: 42 } })]),
      )
      ;(firestore.getCountFromServer as jest.Mock)
        .mockResolvedValueOnce(mockCount(1))
        .mockResolvedValueOnce(mockCount(0))
        .mockResolvedValueOnce(mockCount(0))

      const result = await dashboardService.fetchDashboardData(true)
      expect(result.uncompletedApplicationsEmails).toEqual([])
    })
  })

  describe('fetchDashboardData (non-reviewer/full admin view)', () => {
    it('aggregates applications, registrations, users, and today-only classes', async () => {
      const today = new Date()
      const notToday = new Date(2000, 0, 1)

      ;(firestore.getDocs as jest.Mock)
        .mockResolvedValueOnce(
          mockSnapshot([
            mockDoc('reg-1', {
              personal: { email: 'uncompleted-reg@example.com' },
            }),
          ]),
        )
        .mockResolvedValueOnce(
          mockSnapshot([
            mockDoc('app-1', {
              personal: { email: ' uncompleted-app@example.com ' },
            }),
            mockDoc('app-2', { personal: {} }),
          ]),
        )
        .mockResolvedValueOnce(
          mockSnapshot([
            mockDoc('reg-2', {
              personal: { email: 'Submitted@Example.com' },
            }),
          ]),
        )
        .mockResolvedValueOnce(
          mockSnapshot([
            mockDoc('class-today', {
              course: 'Python 1',
              meetingTimes: [today, notToday],
            }),
            mockDoc('class-not-today', {
              course: 'Python 2',
              meetingTimes: [notToday],
            }),
            mockDoc('class-no-times', { course: 'Python 3' }),
          ]),
        )
      ;(firestore.getCountFromServer as jest.Mock)
        .mockResolvedValueOnce(mockCount(20))
        .mockResolvedValueOnce(mockCount(15))
        .mockResolvedValueOnce(mockCount(10))
        .mockResolvedValueOnce(mockCount(50))
        .mockResolvedValueOnce(mockCount(30))
        .mockResolvedValueOnce(mockCount(12))

      const result = await dashboardService.fetchDashboardData(false)

      expect(result.dashboardData).toEqual({
        applications: {
          total: 20,
          submitted: 15,
          decided: 10,
          registered: 1,
          totalRegistrationsStarted: 30,
          enrolled: 12,
        },
        users: { total: 50 },
      })
      expect(result.uncompletedRegistrationsEmails).toEqual([
        'uncompleted-reg@example.com',
      ])
      expect(result.uncompletedApplicationsEmails).toEqual([
        'uncompleted-app@example.com',
      ])
      expect(result.classesToday).toEqual([
        { id: 'class-today', classNumber: 0, class: expect.any(Object) },
      ])
    })

    it('excludes an uncompleted-registration email if the same email already submitted', async () => {
      ;(firestore.getDocs as jest.Mock)
        .mockResolvedValueOnce(
          mockSnapshot([
            mockDoc('reg-1', { personal: { email: 'dup@example.com' } }),
          ]),
        )
        .mockResolvedValueOnce(mockSnapshot([]))
        .mockResolvedValueOnce(
          mockSnapshot([
            mockDoc('reg-2', { personal: { email: 'DUP@Example.com' } }),
          ]),
        )
        .mockResolvedValueOnce(mockSnapshot([]))
      ;(firestore.getCountFromServer as jest.Mock).mockResolvedValue(
        mockCount(0),
      )

      const result = await dashboardService.fetchDashboardData(false)
      expect(result.uncompletedRegistrationsEmails).toEqual([])
    })

    it('ignores non-array or missing meetingTimes without throwing', async () => {
      ;(firestore.getDocs as jest.Mock)
        .mockResolvedValueOnce(mockSnapshot([]))
        .mockResolvedValueOnce(mockSnapshot([]))
        .mockResolvedValueOnce(mockSnapshot([]))
        .mockResolvedValueOnce(
          mockSnapshot([
            mockDoc('class-bad', { meetingTimes: 'not-an-array' }),
            mockDoc('class-null-slot', { meetingTimes: [null] }),
          ]),
        )
      ;(firestore.getCountFromServer as jest.Mock).mockResolvedValue(
        mockCount(0),
      )

      const result = await dashboardService.fetchDashboardData(false)
      expect(result.classesToday).toEqual([])
    })
  })

  describe('timeout handling', () => {
    it('rejects with a timeout error if queries do not settle in time', async () => {
      jest.useFakeTimers()
      ;(firestore.getDocs as jest.Mock).mockReturnValue(new Promise(() => {}))
      ;(firestore.getCountFromServer as jest.Mock).mockReturnValue(
        new Promise(() => {}),
      )

      const resultPromise = dashboardService.fetchDashboardData(true, 5000)
      const assertion = expect(resultPromise).rejects.toThrow(
        'Query timeout (5 seconds)',
      )
      await jest.advanceTimersByTimeAsync(5000)
      await assertion
    })

    it('resolves normally when queries settle before the timeout', async () => {
      jest.useFakeTimers()
      ;(firestore.getDocs as jest.Mock).mockResolvedValue(mockSnapshot([]))
      ;(firestore.getCountFromServer as jest.Mock).mockResolvedValue(
        mockCount(0),
      )

      const result = await dashboardService.fetchDashboardData(true, 5000)
      expect(result.dashboardData.applications.total).toBe(0)
    })
  })

  describe('error propagation', () => {
    it('propagates errors thrown by the underlying Firestore queries', async () => {
      ;(firestore.getDocs as jest.Mock).mockRejectedValueOnce(
        new Error('permission-denied'),
      )
      ;(firestore.getCountFromServer as jest.Mock).mockResolvedValue(
        mockCount(0),
      )

      await expect(dashboardService.fetchDashboardData(true)).rejects.toThrow(
        'permission-denied',
      )
    })
  })
})
