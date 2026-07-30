import { flushSync } from 'svelte'
import { objectUrl } from '../src/lib/objectUrl.svelte'

describe('objectUrl', () => {
  const createSpy = jest.fn((blob: Blob) => `blob:${blob.size}`)
  const revokeSpy = jest.fn()

  beforeAll(() => {
    URL.createObjectURL = createSpy
    URL.revokeObjectURL = revokeSpy
  })

  beforeEach(() => {
    createSpy.mockClear()
    revokeSpy.mockClear()
  })

  it('creates an object URL for the current blob', () => {
    const cleanup = $effect.root(() => {
      const blob = new Blob(['a'])
      const url = objectUrl(() => blob)
      flushSync()
      expect(url.current).toBe('blob:1')
    })
    cleanup()
  })

  it('revokes the previous URL when the blob changes', () => {
    const cleanup = $effect.root(() => {
      let blob = $state(new Blob(['a']))
      const url = objectUrl(() => blob)
      flushSync()
      expect(url.current).toBe('blob:1')

      blob = new Blob(['bb'])
      flushSync()
      expect(url.current).toBe('blob:2')
      expect(revokeSpy).toHaveBeenCalledWith('blob:1')
    })
    cleanup()
  })

  it('revokes the URL on cleanup', () => {
    const cleanup = $effect.root(() => {
      const blob = new Blob(['a'])
      objectUrl(() => blob)
      flushSync()
    })
    cleanup()
    expect(revokeSpy).toHaveBeenCalledWith('blob:1')
  })
})
