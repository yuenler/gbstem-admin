import { applicationService } from '$lib/services/applicationService'
import * as firestore from 'firebase/firestore'
import type {} from '../src/data.d.ts'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}))

describe('admin applicationService (Data Access Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn() as jest.Mock
  })

  describe('loadApplicationDetails', () => {
    it('loads application and associated decision data', async () => {
      const mockApp = {
        personal: { email: 'test@example.com', firstName: 'Alice' },
        meta: { decision: { id: 'dec-1' } },
      }
      const mockDecision = { type: 'interview', decision: 'interview' }

      ;(firestore.getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockApp,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockDecision,
        })

      const res = await applicationService.loadApplicationDetails(
        'applications',
        'app-1',
        {} as any,
      )

      expect(res.values.personal.email).toBe('test@example.com')
      expect(res.decision).toBe('interview')
    })

    it('throws error if application document does not exist', async () => {
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(
        applicationService.loadApplicationDetails(
          'applications',
          'app-1',
          {} as any,
        ),
      ).rejects.toThrow('Application not found.')
    })
  })

  describe('saveNotes', () => {
    it('sets decision doc with notes payload and updates application meta.decision', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await applicationService.saveNotes('applications', 'app-1', {} as any)

      expect(firestore.setDoc).toHaveBeenCalled()
      expect(firestore.updateDoc).toHaveBeenCalled()
    })
  })

  describe('saveLikelyDecision', () => {
    it('sets likely decision payload in Firestore', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await applicationService.saveLikelyDecision(
        'applications',
        'app-1',
        'likely yes',
        null,
        {} as any,
      )

      expect(firestore.setDoc).toHaveBeenCalled()
      expect(firestore.updateDoc).toHaveBeenCalled()
    })
  })

  describe('submitOfficialDecision', () => {
    it('submits interview decision and calls scheduleInterview API', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

      await applicationService.submitOfficialDecision(
        'applications',
        'app-1',
        'interview',
        {} as any,
        'alice@example.com',
        'Alice',
        '2026-09-01',
      )

      expect(firestore.setDoc).toHaveBeenCalled()
      expect(firestore.updateDoc).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scheduleInterview',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('submits accepted decision and calls decision API', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

      await applicationService.submitOfficialDecision(
        'applications',
        'app-1',
        'accepted',
        {} as any,
        'alice@example.com',
        'Alice',
        '2026-09-01',
      )

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/decision',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
