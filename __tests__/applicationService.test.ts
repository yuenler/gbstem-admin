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
        meta: { decided: true },
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
      )

      expect(res.values.personal.email).toBe('test@example.com')
      expect(res.decision).toBe('interview')
    })

    it('throws error if application document does not exist', async () => {
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(
        applicationService.loadApplicationDetails('applications', 'app-1'),
      ).rejects.toThrow('Application not found.')
    })

    it('skips fetching a decision doc when meta.decided is false', async () => {
      const mockApp = {
        personal: { email: 'test@example.com', firstName: 'Alice' },
        meta: { decided: false },
      }
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockApp,
      })

      const res = await applicationService.loadApplicationDetails(
        'applications',
        'app-1',
      )

      expect(firestore.getDoc).toHaveBeenCalledTimes(1)
      expect(res.decision).toBeNull()
    })
  })

  describe('saveNotes', () => {
    it('sets decision doc with notes payload and updates application meta.decided', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await applicationService.saveNotes('applications', 'app-1', {} as any)

      expect(firestore.setDoc).toHaveBeenCalled()
      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('writes to the viewed semester decisions collection when provided', async () => {
      ;(firestore.doc as jest.Mock).mockClear()
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await applicationService.saveNotes(
        'semesters/Fall25/applications',
        'app-1',
        {} as any,
        'Fall25',
      )

      expect(firestore.doc).toHaveBeenCalledWith(
        undefined,
        'semesters/Fall25/decisions',
        'app-1',
      )
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

    it('fetches application document to use true applicant email and name if available', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          personal: { email: 'david-h@example.com', firstName: 'David' },
        }),
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

      await applicationService.submitOfficialDecision(
        'applications',
        'app-10',
        'interview',
        {} as any,
        'stale@example.com',
        'Stale',
        '2026-09-01',
      )

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scheduleInterview',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('david-h@example.com'),
        }),
      )
    })

    it('warns but does not throw if the interview scheduling email API responds not-ok', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      })
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(
        applicationService.submitOfficialDecision(
          'applications',
          'app-1',
          'interview',
          {} as any,
          'alice@example.com',
          'Alice',
          '2026-09-01',
        ),
      ).resolves.toBeUndefined()

      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to send interview scheduling email:',
        'Bad Request',
      )
      warnSpy.mockRestore()
    })

    it('warns but does not throw if the decision notification email API responds not-ok', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      })
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      await applicationService.submitOfficialDecision(
        'applications',
        'app-1',
        'rejected',
        {} as any,
        'alice@example.com',
        'Alice',
        '2026-09-01',
      )

      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to send decision notification email:',
        'Bad Request',
      )
      warnSpy.mockRestore()
    })

    it('warns but does not throw if the email fetch call itself rejects', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined)
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('network down'),
      )
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(
        applicationService.submitOfficialDecision(
          'applications',
          'app-1',
          'accepted',
          {} as any,
          'alice@example.com',
          'Alice',
          '2026-09-01',
        ),
      ).resolves.toBeUndefined()

      expect(warnSpy).toHaveBeenCalledWith(
        'Email notification request failed:',
        expect.any(Error),
      )
      warnSpy.mockRestore()
    })
  })

  describe('saveApplicationDetails', () => {
    it('saves the updated values with semester stamping', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await applicationService.saveApplicationDetails(
        'applications',
        'app-1',
        { personal: { firstName: 'Alice' } } as any,
        'Spring26',
      )

      expect(firestore.setDoc).toHaveBeenCalledTimes(1)
      const [, payload, options] = (firestore.setDoc as jest.Mock).mock.calls[0]
      expect(payload).toEqual(
        expect.objectContaining({
          personal: { firstName: 'Alice' },
          semester: 'Spring26',
        }),
      )
      // Merge-only write so fields the edit form doesn't own (timestamps, meta, ...)
      // can't be clobbered by a stale in-memory snapshot - see saveApplicationDetails's docstring.
      expect(options).toEqual({ merge: true })
    })

    it('propagates errors from setDoc', async () => {
      ;(firestore.setDoc as jest.Mock).mockRejectedValueOnce(
        new Error('permission-denied'),
      )

      await expect(
        applicationService.saveApplicationDetails(
          'applications',
          'app-1',
          {} as any,
        ),
      ).rejects.toThrow('permission-denied')
    })
  })

  describe('bulkSetDecision', () => {
    it('sets a decision doc, flips meta.decided, and triggers decision email for every application id', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValue(undefined)
      ;(firestore.updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(firestore.getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          personal: { email: 'alice@example.com', firstName: 'Alice' },
        }),
      })
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

      await applicationService.bulkSetDecision(
        ['app-1', 'app-2'],
        'applications',
        'decisions',
        'accepted',
        'Spring26',
      )

      expect(firestore.setDoc).toHaveBeenCalledTimes(2)
      expect(firestore.updateDoc).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/decision',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            decision: 'accepted',
            email: 'alice@example.com',
            name: 'Alice',
          }),
        }),
      )
      const [, payload] = (firestore.setDoc as jest.Mock).mock.calls[0]
      expect(payload).toEqual(
        expect.objectContaining({ type: 'accepted', semester: 'Spring26' }),
      )
    })

    it('rejects if any write in the batch fails', async () => {
      ;(firestore.setDoc as jest.Mock).mockResolvedValue(undefined)
      ;(firestore.updateDoc as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('permission-denied'))

      await expect(
        applicationService.bulkSetDecision(
          ['app-1', 'app-2'],
          'applications',
          'decisions',
          'rejected',
        ),
      ).rejects.toThrow('permission-denied')
    })
  })
})
