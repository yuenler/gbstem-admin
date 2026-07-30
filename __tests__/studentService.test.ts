import type ClassData from '$lib/data/types/ClassData'
import type Student from '$lib/data/types/Student'
import { studentService } from '$lib/services/studentService'
import * as firestore from 'firebase/firestore'
import type {} from '../src/data.d.ts'

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((val) => val),
  arrayRemove: jest.fn((val) => val),
}))

describe('studentService (Data Access Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn() as jest.Mock
  })

  describe('fetchStudentProfile', () => {
    it('returns student profile if record exists', async () => {
      const mockData = {
        personal: {
          studentFirstName: 'Bobby',
          studentLastName: 'Tables',
          email: 'bobby@example.com',
        },
        academic: { grade: 6, school: 'Lincoln' },
      }
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData,
      })

      const profile = await studentService.fetchStudentProfile('s-1')
      expect(profile).not.toBeNull()
      expect(profile?.name).toBe('Bobby Tables')
    })

    it('returns null if profile doc does not exist', async () => {
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      })

      const profile = await studentService.fetchStudentProfile('s-1')
      expect(profile).toBeNull()
    })
  })

  describe('fetchAllClasses', () => {
    it('queries and maps class options', async () => {
      const mockDocs = [
        {
          id: 'c-1',
          data: () => ({
            course: 'Python 1',
            instructorFirstName: 'Jane',
            instructorLastName: 'Doe',
          }),
        },
      ]
      ;(firestore.getDocs as jest.Mock).mockResolvedValueOnce({
        forEach: (cb: any) => mockDocs.forEach(cb),
      })

      const res = await studentService.fetchAllClasses()
      expect(res.classes.length).toBe(1)
      expect(res.nameToUid['Python 1 (Jane Doe)']).toBe('c-1')
    })
  })

  describe('enrollStudent', () => {
    it('updates Firestore class document and sends enrollment email API call', async () => {
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

      const student: Student = {
        name: 'Bobby Tables',
        email: 'bobby@example.com',
        secondaryEmail: 'parent@example.com',
        phone: '555-0000',
        grade: 6,
        school: 'Lincoln',
        parentName: 'Sarah Tables',
      }

      const classData: ClassData = {
        instructorFirstName: 'Jane',
        instructorLastName: 'Doe',
        instructorEmail: 'jane@example.com',
        classTime1: '4:00 PM',
        classTime2: '4:00 PM',
        course: 'Python 1',
        online: true,
      } as ClassData

      await studentService.enrollStudent(student, classData, 'c-1', 's-1')
      expect(firestore.updateDoc).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/enroll',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  describe('dropStudentFromClass', () => {
    it('calls updateDoc with arrayRemove', async () => {
      ;(firestore.updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        data: () => ({ classes: [] }),
      })
      await studentService.dropStudentFromClass('c-1', 's-1')
      expect(firestore.updateDoc).toHaveBeenCalled()
    })
  })
})
