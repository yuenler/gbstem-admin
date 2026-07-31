import { interviewService } from '$lib/services/interviewService'
import * as firestore from 'firebase/firestore'
import type {} from '../src/data.d.ts'

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}))

describe('interviewService (Data Access Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn() as jest.Mock
  })

  describe('fetchInterviewSlots', () => {
    it('queries and parses interview slots from Firestore', async () => {
      const mockDocs = [
        {
          id: 'slot-1',
          data: () => ({
            date: { seconds: 1779900600 },
            interviewerName: 'Alice',
            meetingLink: 'https://zoom.us/1',
          }),
        },
      ]
      ;(firestore.getDocs as jest.Mock).mockResolvedValueOnce({
        forEach: (cb: any) => mockDocs.forEach(cb),
      })

      const slots = await interviewService.fetchInterviewSlots()
      expect(slots.length).toBe(1)
      expect(slots[0].id).toBe('slot-1')
    })
  })

  describe('fetchSlotRequests', () => {
    it('queries and returns sorted slot requests', async () => {
      const mockDocs = [
        {
          id: 'req-1',
          data: () => ({
            date: { seconds: 1779900600 },
            name: 'Bob',
          }),
        },
      ]
      ;(firestore.getDocs as jest.Mock).mockResolvedValueOnce({
        forEach: (cb: any) => mockDocs.forEach(cb),
      })

      const requests = await interviewService.fetchSlotRequests()
      expect(requests.length).toBe(1)
      expect(requests[0].id).toBe('req-1')
    })
  })

  describe('fetchEligibleInterviewees', () => {
    it('queries applications and filters to eligible interviewees', async () => {
      const mockDocs = [
        {
          id: 'app-1',
          data: () => ({
            meta: { interview: false, submitted: true },
            personal: { firstName: 'Timmy', lastName: 'Tester' },
          }),
        },
        {
          id: 'app-2',
          data: () => ({
            meta: { interview: true, submitted: true },
            personal: { firstName: 'Already', lastName: 'Scheduled' },
          }),
        },
      ]
      ;(firestore.getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockDocs,
      })

      const result = await interviewService.fetchEligibleInterviewees()
      expect(result.names).toEqual([{ name: 'Timmy Tester' }])
      expect(result.options).toHaveLength(1)
      expect((result.options[0] as any).docId).toBe('app-1')
    })
  })

  describe('createOrAssignInterviewSlot', () => {
    it('saves new slot and triggers email API if assigned', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

      const slotToAdd = {
        date: '2026-08-01T15:00:00.000Z',
        meetingLink: 'https://zoom.us/1',
        interviewerName: 'Alice',
        interviewerEmail: 'alice@example.com',
        intervieweeId: 'uid-123',
        intervieweeEmail: 'student@example.com',
        intervieweeFirstName: 'Timmy',
      } as Data.InterviewSlot

      const result = await interviewService.createOrAssignInterviewSlot(
        slotToAdd,
        'doc-123',
        'user-1',
      )

      expect(result.id).toBeDefined()
      expect(firestore.setDoc).toHaveBeenCalled()
      expect(firestore.updateDoc).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/assignInterview',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('throws error if API assignment call fails', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })

      const slotToAdd = {
        date: '2026-08-01T15:00:00.000Z',
        meetingLink: 'https://zoom.us/1',
        interviewerName: 'Alice',
        interviewerEmail: 'alice@example.com',
        intervieweeId: 'uid-123',
      } as Data.InterviewSlot

      await expect(
        interviewService.createOrAssignInterviewSlot(
          slotToAdd,
          'doc-123',
          'user-1',
        ),
      ).rejects.toThrow('Failed to send interview assignment email')
    })
  })

  describe('updateInterviewSlot', () => {
    it('saves the updated slot with a Date-coerced date field', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)

      const interview = {
        id: 'slot-1',
        date: '2026-08-01T15:00:00.000Z',
        meetingLink: 'https://zoom.us/2',
        interviewerName: 'Alice',
        interviewerEmail: 'alice@example.com',
      } as unknown as Data.InterviewSlot

      await interviewService.updateInterviewSlot(interview)

      expect(firestore.setDoc).toHaveBeenCalledTimes(1)
      const [, payload] = (firestore.setDoc as jest.Mock).mock.calls[0]
      expect(payload.date).toBeInstanceOf(Date)
      expect(payload.meetingLink).toBe('https://zoom.us/2')
    })

    it('propagates errors from setDoc', async () => {
      ;(firestore.setDoc as jest.Mock).mockRejectedValueOnce(
        new Error('permission-denied'),
      )

      const interview = {
        id: 'slot-1',
        date: '2026-08-01T15:00:00.000Z',
        meetingLink: 'https://zoom.us/2',
      } as unknown as Data.InterviewSlot

      await expect(
        interviewService.updateInterviewSlot(interview),
      ).rejects.toThrow('permission-denied')
    })
  })

  describe('deleteInterviewSlot', () => {
    it('calls deleteDoc with slot id', async () => {
      ;(firestore.deleteDoc as jest.Mock).mockResolvedValueOnce(undefined)
      await interviewService.deleteInterviewSlot('slot-1')
      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('propagates errors from deleteDoc', async () => {
      ;(firestore.deleteDoc as jest.Mock).mockRejectedValueOnce(
        new Error('not-found'),
      )
      await expect(
        interviewService.deleteInterviewSlot('slot-1'),
      ).rejects.toThrow('not-found')
    })
  })
})
