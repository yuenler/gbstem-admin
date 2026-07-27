import { dialogState, actionsState } from '../src/lib/stores.svelte'

describe('stores.svelte', () => {
  beforeEach(() => {
    dialogState.current = null
    actionsState.current = null
  })

  describe('dialogState', () => {
    it('initializes to null', () => {
      expect(dialogState.current).toBeNull()
    })

    it('can be set and cleared', () => {
      dialogState.current = 'dialog-1'
      expect(dialogState.current).toBe('dialog-1')
      dialogState.current = null
      expect(dialogState.current).toBeNull()
    })
  })

  describe('actionsState', () => {
    it('initializes to null', () => {
      expect(actionsState.current).toBeNull()
    })

    it('can be set and cleared', () => {
      const mockAction = {
        name: 'test',
        color: 'red' as const,
        callback: jest.fn(),
      }
      actionsState.current = [mockAction]
      expect(actionsState.current).toEqual([mockAction])
      actionsState.current = null
      expect(actionsState.current).toBeNull()
    })
  })
})
