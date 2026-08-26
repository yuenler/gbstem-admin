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

    it('writes to the tokens collection', async () => {
      // The existing payload assertion above reads `mock.calls[0]`'s second
      // argument and never looks at the first, so a token written into the
      // wrong collection would pass it.
      ;(firestore.addDoc as jest.Mock).mockResolvedValueOnce({ id: 'tok-1' })

      await tokenService.createToken('admin', true, 24)

      // Compared on the path alone: the mocked `db` handle is `undefined`, and
      // `expect.anything()` does not match `undefined`.
      const [, collectionPath] = (firestore.collection as jest.Mock).mock
        .calls[0]
      expect(collectionPath).toBe('tokens')
    })

    it('writes exactly the fields a token document has', () => {
      // `expect.objectContaining` above lets a stray field through and, more
      // importantly, lets a *missing* one through - so a field added to
      // `tokenSchema` and wired into the form but never passed to `createToken`
      // would go unnoticed. This pins the whole shape.
      ;(firestore.addDoc as jest.Mock).mockResolvedValueOnce({ id: 'tok-1' })

      return tokenService.createToken('reviewer', false, 12).then(() => {
        const [, payload] = (firestore.addDoc as jest.Mock).mock.calls[0]
        expect(Object.keys(payload).sort()).toEqual([
          'consumable',
          'consumers',
          'expires',
          'role',
        ])
      })
    })

    it('derives the expiry from the hours it was given', async () => {
      // `expect.any(Date)` above passes for any expiry at all, including one
      // hard-coded to 24 hours regardless of what the form asked for.
      ;(firestore.addDoc as jest.Mock).mockResolvedValue({ id: 'tok-1' })

      const before = Date.now()
      await tokenService.createToken('reviewer', false, 5)
      const after = Date.now()

      const [, payload] = (firestore.addDoc as jest.Mock).mock.calls[0]
      const fiveHours = 5 * 60 * 60 * 1000
      expect(payload.expires.getTime()).toBeGreaterThanOrEqual(
        before + fiveHours,
      )
      expect(payload.expires.getTime()).toBeLessThanOrEqual(after + fiveHours)
    })

    it('gives a different expiry for a different number of hours', async () => {
      ;(firestore.addDoc as jest.Mock).mockResolvedValue({ id: 'tok-1' })

      await tokenService.createToken('reviewer', false, 1)
      await tokenService.createToken('reviewer', false, 48)

      const calls = (firestore.addDoc as jest.Mock).mock.calls
      const gap = calls[1][1].expires.getTime() - calls[0][1].expires.getTime()
      // 47 hours apart, give or take the milliseconds between the two calls.
      expect(gap).toBeGreaterThan(46.9 * 60 * 60 * 1000)
      expect(gap).toBeLessThan(47.1 * 60 * 60 * 1000)
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
