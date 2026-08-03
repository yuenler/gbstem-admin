import { handle } from '../src/hooks.server'
import { adminAuth } from '$lib/server/firebase'

function createEvent(sessionCookie?: string) {
  return {
    cookies: {
      get: jest.fn((name: string) =>
        name === '__session' ? sessionCookie : undefined,
      ),
    },
    locals: {} as App.Locals,
  } as any
}

describe('hooks.server handle', () => {
  const resolve = jest.fn().mockResolvedValue('resolved-response')

  beforeEach(() => {
    resolve.mockClear()
    ;(adminAuth.verifySessionCookie as jest.Mock).mockReset()
    ;(adminAuth.getUser as jest.Mock).mockReset()
  })

  it('sets locals.user and resolves the request for an admin session', async () => {
    ;(adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: 'uid-1',
    })
    ;(adminAuth.getUser as jest.Mock).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
      customClaims: { role: 'admin' },
    })
    const event = createEvent('cookie-value')

    const result = await handle({ event, resolve } as any)

    expect(event.locals.user).toEqual({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
      role: 'admin',
    })
    expect(resolve).toHaveBeenCalledWith(event)
    expect(result).toBe('resolved-response')
  })

  it('sets locals.user and resolves the request for a reviewer session', async () => {
    ;(adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: 'uid-2',
    })
    ;(adminAuth.getUser as jest.Mock).mockResolvedValue({
      uid: 'uid-2',
      email: 'reviewer@example.com',
      emailVerified: true,
      customClaims: { role: 'reviewer' },
    })
    const event = createEvent('cookie-value')

    await handle({ event, resolve } as any)

    expect(event.locals.user?.role).toBe('reviewer')
    expect(resolve).toHaveBeenCalledWith(event)
  })

  // Regression test: redirect() throws immediately (matching real
  // @sveltejs/kit), and was previously called inside the try block, so its
  // throw was silently swallowed by the surrounding catch and the redirect
  // never happened. It must now propagate out of handle().
  it('redirects non-admin/reviewer roles to the portal instead of silently continuing', async () => {
    ;(adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({
      uid: 'uid-3',
    })
    ;(adminAuth.getUser as jest.Mock).mockResolvedValue({
      uid: 'uid-3',
      email: 'student@example.com',
      emailVerified: true,
      customClaims: { role: 'student' },
    })
    const event = createEvent('cookie-value')

    let thrown: any
    try {
      await handle({ event, resolve } as any)
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeDefined()
    expect(thrown.status).toBe(301)
    expect(thrown.location).toBe('https://portal.gbstem.org')
    expect(event.locals.user).toBeNull()
    expect(resolve).not.toHaveBeenCalled()
  })

  it('sets locals.user to null and resolves without redirecting when the session cookie is invalid', async () => {
    ;(adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
      new Error('invalid cookie'),
    )
    const event = createEvent('bad-cookie')

    const result = await handle({ event, resolve } as any)

    expect(event.locals.user).toBeNull()
    expect(resolve).toHaveBeenCalledWith(event)
    expect(result).toBe('resolved-response')
  })
})
