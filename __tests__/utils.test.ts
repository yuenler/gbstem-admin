// Set timezone to America/New_York so that date formatting tests are deterministic
process.env.TZ = 'America/New_York'

jest.mock('$lib/stores', () => ({
  alert: {
    trigger: jest.fn(),
  },
}))

import { alert } from '$lib/stores'
import {
  cn,
  clickOutside,
  trapFocus,
  addDataToHtmlTemplate,
  formatTime24to12,
  formatClassTimes,
  formatDate,
  formatDateString,
  formatDateLocal,
  formatDateShort,
  timestampToDate,
  classHeldToday,
  isClassUpcoming,
  normalizeCapitals,
  getNearestFutureClass,
  getNearestFutureClassIndex,
  copyEmails,
  toLocalISOString,
} from '../src/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('handles conditional class names', () => {
      expect(cn('class1', false && 'class2', true && 'class3')).toBe(
        'class1 class3',
      )
    })

    it('merges tailwind classes properly using twMerge', () => {
      expect(cn('px-2 py-1', 'p-4')).toBe('p-4')
    })
  })

  describe('clickOutside', () => {
    let node: HTMLDivElement
    let outside: HTMLButtonElement
    let inside: HTMLButtonElement

    beforeEach(() => {
      node = document.createElement('div')
      outside = document.createElement('button')
      inside = document.createElement('button')

      node.appendChild(inside)
      document.body.appendChild(node)
      document.body.appendChild(outside)
    })

    afterEach(() => {
      document.body.removeChild(node)
      document.body.removeChild(outside)
    })

    it('dispatches outclick event when clicked outside', () => {
      const listener = jest.fn()
      node.addEventListener('outclick', listener)

      const action = clickOutside(node)
      outside.click()

      expect(listener).toHaveBeenCalled()
      action.destroy()
    })

    it('does not dispatch outclick event when clicked inside', () => {
      const listener = jest.fn()
      node.addEventListener('outclick', listener)

      const action = clickOutside(node)
      inside.click()

      expect(listener).not.toHaveBeenCalled()
      action.destroy()
    })

    it('removes click event listener when destroyed', () => {
      const listener = jest.fn()
      node.addEventListener('outclick', listener)

      const action = clickOutside(node)
      action.destroy()

      outside.click()
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('trapFocus', () => {
    let container: HTMLDivElement
    let button1: HTMLButtonElement
    let button2: HTMLButtonElement
    let outsideButton: HTMLButtonElement

    beforeEach(() => {
      container = document.createElement('div')
      button1 = document.createElement('button')
      button2 = document.createElement('button')
      outsideButton = document.createElement('button')

      container.appendChild(button1)
      container.appendChild(button2)
      document.body.appendChild(container)
      document.body.appendChild(outsideButton)
    })

    afterEach(() => {
      document.body.removeChild(container)
      document.body.removeChild(outsideButton)
    })

    it('focuses the first focusable element on initialization', () => {
      outsideButton.focus()
      expect(document.activeElement).toBe(outsideButton)

      const action = trapFocus(container)
      expect(document.activeElement).toBe(button1)

      action.destroy()
    })

    it('restores focus to previous element on destroy', () => {
      outsideButton.focus()
      const action = trapFocus(container)
      action.destroy()
      expect(document.activeElement).toBe(outsideButton)
    })

    it('wraps focus from last to first element on Tab', () => {
      const action = trapFocus(container)
      button2.focus()

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
      })
      container.dispatchEvent(event)

      expect(document.activeElement).toBe(button1)
      action.destroy()
    })

    it('wraps focus from first to last element on Shift+Tab', () => {
      const action = trapFocus(container)
      button1.focus()

      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })
      container.dispatchEvent(event)

      expect(document.activeElement).toBe(button2)
      action.destroy()
    })
  })

  describe('addDataToHtmlTemplate', () => {
    it('substitutes basic values', () => {
      const html = 'Hello {{name}}!'
      const template = { data: { name: 'World' } }
      expect(addDataToHtmlTemplate(html, template)).toBe('Hello World!')
    })

    it('substitutes nested values', () => {
      const html = 'Hello {{user.name}}!'
      const template = { data: { user: { name: 'Alice' } } }
      expect(addDataToHtmlTemplate(html, template)).toBe('Hello Alice!')
    })

    it('handles spacing in placeholders', () => {
      const html = 'Hello {{   user.name   }}!'
      const template = { data: { user: { name: 'Bob' } } }
      expect(addDataToHtmlTemplate(html, template)).toBe('Hello Bob!')
    })

    it('replaces missing values with empty string', () => {
      const html = 'Hello {{user.age}}!'
      const template = { data: { user: {} } }
      expect(addDataToHtmlTemplate(html, template)).toBe('Hello !')
    })
  })

  describe('formatTime24to12', () => {
    it('formats times correctly', () => {
      expect(formatTime24to12('13:30')).toBe('1:30 PM')
      expect(formatTime24to12('09:05')).toBe('9:05 AM')
      expect(formatTime24to12('00:00')).toBe('12:00 AM')
      expect(formatTime24to12('12:00')).toBe('12:00 PM')
    })
  })

  describe('formatClassTimes', () => {
    it('formats a list of class days and times', () => {
      const days = ['Monday', 'Wednesday']
      const times = ['14:00', '16:30']
      expect(formatClassTimes(days, times)).toEqual([
        'Monday at 2:00 PM',
        'Wednesday at 4:30 PM',
      ])
    })
  })

  describe('date formatters', () => {
    it('formatDate formats date without year', () => {
      const date = new Date(2026, 4, 28, 15, 30) // May 28, 2026 3:30 PM
      expect(formatDate(date)).toBe('Thursday, May 28 at 3:30 PM')
    })

    it('formatDateString formats a date string with year', () => {
      expect(formatDateString('2026-05-28T15:30:00')).toBe(
        'Thursday, May 28, 2026 at 03:30 PM',
      )
    })

    it('formatDateLocal formats Date or string with timezone abbreviation', () => {
      expect(formatDateLocal('2026-05-28T15:30:00')).toBe(
        'Thursday, May 28, 2026 at 03:30 PM EDT',
      )
    })

    it('formatDateShort formats a short date representation', () => {
      const date = new Date(2026, 4, 28, 15, 30)
      expect(formatDateShort(date)).toBe('Thu, May 28')
    })

    it('toLocalISOString formats local date components to ISO string format', () => {
      const date = new Date(2026, 4, 28, 15, 30)
      expect(toLocalISOString(date)).toBe('2026-05-28T15:30')
    })
  })

  describe('timestampToDate', () => {
    it('converts Firestore Timestamp to Date', () => {
      const mockTimestamp = { seconds: 1779900600 } as any // 2026-05-28T15:30:00Z
      const result = timestampToDate(mockTimestamp)
      expect(result.getTime()).toBe(1779900600 * 1000)
    })
  })

  describe('classHeldToday and isClassUpcoming with fake timers', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      // Set local system time to May 28, 2026 12:00:00 EDT
      jest.setSystemTime(new Date('2026-05-28T12:00:00-04:00'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    describe('classHeldToday', () => {
      it('returns true if class was held earlier today', () => {
        const classTime = new Date('2026-05-28T10:00:00-04:00')
        const mockTimestamp = Object.assign(classTime, {
          seconds: classTime.getTime() / 1000,
        })
        const datesHeld = [mockTimestamp] as any
        const classTimeToday = { seconds: classTime.getTime() / 1000 } as any
        expect(classHeldToday(datesHeld, classTimeToday)).toBe(true)
      })

      it('returns true if next class time is in the future', () => {
        const datesHeld: any[] = []
        const classTimeToday = {
          seconds: new Date('2026-05-28T14:00:00-04:00').getTime() / 1000,
        } as any
        expect(classHeldToday(datesHeld, classTimeToday)).toBe(true)
      })

      it('returns false if class was held on a different day and no future classes are scheduled today', () => {
        const classTime = new Date('2026-05-27T10:00:00-04:00')
        const mockTimestamp = Object.assign(classTime, {
          seconds: classTime.getTime() / 1000,
        })
        const datesHeld = [mockTimestamp] as any
        const classTimeToday = { seconds: classTime.getTime() / 1000 } as any
        expect(classHeldToday(datesHeld, classTimeToday)).toBe(false)
      })
    })

    describe('isClassUpcoming', () => {
      it('returns true if class starts within 30 minutes in the future', () => {
        const classDate = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
        expect(isClassUpcoming(classDate)).toBe(true)
      })

      it('returns false if class starts more than 30 minutes in the future', () => {
        const classDate = new Date(Date.now() + 45 * 60 * 1000) // 45 minutes from now
        expect(isClassUpcoming(classDate)).toBe(false)
      })

      it('returns false if class started in the past', () => {
        const classDate = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        expect(isClassUpcoming(classDate)).toBe(false)
      })
    })

    describe('getNearestFutureClass and getNearestFutureClassIndex', () => {
      it('returns formatted date of the nearest future class and its index', () => {
        const pastClass = {
          seconds: new Date('2026-05-27T12:00:00-04:00').getTime() / 1000,
        } as any
        const futureClass1 = {
          seconds: new Date('2026-05-28T15:30:00-04:00').getTime() / 1000,
        } as any
        const futureClass2 = {
          seconds: new Date('2026-05-29T10:00:00-04:00').getTime() / 1000,
        } as any

        const meetingTimes = [pastClass, futureClass1, futureClass2]

        expect(getNearestFutureClassIndex(meetingTimes)).toBe(1)
        expect(getNearestFutureClass(meetingTimes)).toBe(
          'Thursday, May 28 at 3:30 PM',
        )
      })

      it('returns index -1 and default message when there are no future classes', () => {
        const pastClass = {
          seconds: new Date('2026-05-27T12:00:00-04:00').getTime() / 1000,
        } as any
        const meetingTimes = [pastClass]

        expect(getNearestFutureClassIndex(meetingTimes)).toBe(-1)
        expect(getNearestFutureClass(meetingTimes)).toBe('No Upcoming Classes')
      })
    })
  })

  describe('normalizeCapitals', () => {
    it('normalizes names to title case', () => {
      expect(normalizeCapitals('john doe')).toBe('John Doe')
      expect(normalizeCapitals('JOHN DOE')).toBe('John Doe')
      expect(normalizeCapitals('jOhN DoE')).toBe('John Doe')
    })
  })

  describe('copyEmails', () => {
    let originalClipboard: any

    beforeAll(() => {
      originalClipboard = { ...navigator.clipboard }
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn(),
        },
        writable: true,
        configurable: true,
      })
    })

    afterAll(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      })
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('triggers success alert when email copying succeeds', async () => {
      ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined)

      copyEmails('test@example.com')

      // Wait for promise microtasks
      await new Promise(process.nextTick)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'test@example.com',
      )
      expect(alert.trigger).toHaveBeenCalledWith(
        'success',
        'Emails copied to clipboard!',
      )
    })

    it('triggers error alert when email copying fails', async () => {
      ;(navigator.clipboard.writeText as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      )

      copyEmails('test@example.com')

      // Wait for promise microtasks
      await new Promise(process.nextTick)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'test@example.com',
      )
      expect(alert.trigger).toHaveBeenCalledWith(
        'error',
        'Failed to copy emails to clipboard!',
      )
    })
  })
})
