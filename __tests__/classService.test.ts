import { classService } from '$lib/services/classService'
import * as firestore from 'firebase/firestore'
import type {} from '../src/data.d.ts'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}))

describe('admin classService (Data Access Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchClassData', () => {
    it('fetches and formats class data from Firestore', async () => {
      const mockData = {
        course: 'Python 1',
        meetingTimes: [{ seconds: 1779900600 }],
        students: ['s1'],
      }
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData,
      })

      const res = await classService.fetchClassData('c1')
      expect(res).not.toBeNull()
      expect(res?.course).toBe('Python 1')
    })

    it('returns null if class does not exist', async () => {
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      })

      const res = await classService.fetchClassData('c1')
      expect(res).toBeNull()
    })
  })

  describe('updateClassStatuses', () => {
    it('calls updateDoc with updated classStatuses', async () => {
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await classService.updateClassStatuses('c1', ['Status 1'])
      expect(firestore.updateDoc).toHaveBeenCalled()
    })
  })

  describe('fetchStudentList', () => {
    it('fetches student details for array of student UIDs', async () => {
      const mockStudent = {
        personal: {
          studentFirstName: 'alice',
          studentLastName: 'smith',
          email: 'alice@example.com',
        },
      }
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockStudent,
      })

      const list = await classService.fetchStudentList(['s1'])
      expect(list.length).toBe(1)
      expect(list[0].name).toBe('Alice Smith')
    })
  })
})
