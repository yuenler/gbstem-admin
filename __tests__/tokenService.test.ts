import { tokenService } from '$lib/services/tokenService'
import * as firestore from 'firebase/firestore'
import type {} from '../src/data.d.ts'

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(() => ({})),
  deleteDoc: jest.fn(),
  doc: jest.fn(() => ({})),
}))

describe('tokenService (Data Access Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createToken', () => {
    it('creates a token document and returns its id', async () => {
      ;(firestore.addDoc as jest.Mock).mockResolvedValueOnce({ id: 'tok-1' })

      const id = await tokenService.createToken('admin', true, 24)

      expect(id).toBe('tok-1')
      expect(firestore.addDoc).toHaveBeenCalledTimes(1)
      const [, payload] = (firestore.addDoc as jest.Mock).mock.calls[0]
      expect(payload).toEqual(
        expect.objectContaining({
          role: 'admin',
          consumable: true,
          consumers: [],
          expires: expect.any(Date),
        }),
      )
    })

    it('propagates errors from addDoc', async () => {
      ;(firestore.addDoc as jest.Mock).mockRejectedValueOnce(
        new Error('permission-denied'),
      )

      await expect(
        tokenService.createToken('reviewer', false, 24),
      ).rejects.toThrow('permission-denied')
    })
  })

  describe('deleteToken', () => {
    it('deletes the given token', async () => {
      ;(firestore.deleteDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await tokenService.deleteToken('tok-1')

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1)
    })

    it('propagates errors from deleteDoc', async () => {
      ;(firestore.deleteDoc as jest.Mock).mockRejectedValueOnce(
        new Error('permission-denied'),
      )

      await expect(tokenService.deleteToken('tok-1')).rejects.toThrow(
        'permission-denied',
      )
    })
  })

  describe('deleteTokens', () => {
    it('deletes all given tokens in parallel', async () => {
      ;(firestore.deleteDoc as jest.Mock).mockResolvedValue(undefined)

      await tokenService.deleteTokens(['tok-1', 'tok-2'])

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(2)
    })

    it('rejects if any deletion in the batch fails', async () => {
      ;(firestore.deleteDoc as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('permission-denied'))

      await expect(
        tokenService.deleteTokens(['tok-1', 'tok-2']),
      ).rejects.toThrow('permission-denied')
    })
  })
})
