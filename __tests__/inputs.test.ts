import { mount, unmount, flushSync } from 'svelte'
import { fireEvent } from '@testing-library/dom'
import TextInput from '../src/lib/components/TextInput.svelte'
import EmailInput from '../src/lib/components/EmailInput.svelte'
import PasswordInput from '../src/lib/components/PasswordInput.svelte'
import NumberInput from '../src/lib/components/NumberInput.svelte'
import CheckboxInput from '../src/lib/components/CheckboxInput.svelte'
import DateTimeInput from '../src/lib/components/DateTimeInput.svelte'
import Textarea from '../src/lib/components/Textarea.svelte'
import Button from '../src/lib/components/Button.svelte'
import Loading from '../src/lib/components/Loading.svelte'
import Disclosure from '../src/lib/components/Disclosure.svelte'
import Card from '../src/lib/components/Card.svelte'

describe('UI & Input Components', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('TextInput', () => {
    it('renders with label and binding value', () => {
      const val = 'hello'
      const app = mount(TextInput, {
        target: container,
        props: {
          label: 'Test Label',
          value: val,
          required: true,
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input).not.toBeNull()
      expect(input.value).toBe('hello')
      expect(input.required).toBe(true)
      expect(container.textContent).toContain('Test Label*')

      unmount(app)
    })

    it('sets custom validity based on validations and required state', () => {
      const app = mount(TextInput, {
        target: container,
        props: {
          label: 'Validated',
          required: true,
          value: '',
          validations: [
            [false, 'Ignored error'],
            [true, 'Custom error message'],
          ],
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('Please fill required fields.')

      unmount(app)
    })

    it('sets validation message from custom validations when not required', () => {
      const app = mount(TextInput, {
        target: container,
        props: {
          label: 'Custom Validation',
          required: false,
          value: 'test',
          validations: [[true, 'Must match pattern']],
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('Must match pattern')

      unmount(app)
    })

    it('clears custom validity when all validations pass', () => {
      const app = mount(TextInput, {
        target: container,
        props: {
          label: 'Valid Input',
          required: false,
          value: 'valid',
          validations: [[false, 'Error']],
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('')

      unmount(app)
    })

    it('supports object and string class props', () => {
      const app = mount(TextInput, {
        target: container,
        props: {
          class: {
            container: 'custom-container-class',
            input: 'custom-input-class',
          },
        },
      })
      flushSync()

      const wrapper = container.firstElementChild as HTMLElement
      const input = container.querySelector('input') as HTMLInputElement
      expect(wrapper.classList.contains('custom-container-class')).toBe(true)
      expect(input.classList.contains('custom-input-class')).toBe(true)

      unmount(app)
    })
  })

  describe('EmailInput', () => {
    it('renders email type input and label', () => {
      const app = mount(EmailInput, {
        target: container,
        props: {
          label: 'Email Address',
          value: 'user@example.com',
          required: true,
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('email')
      expect(input.value).toBe('user@example.com')
      expect(container.textContent).toContain('Email Address*')

      unmount(app)
    })

    it('passes validations to underlying TextInput', () => {
      const app = mount(EmailInput, {
        target: container,
        props: {
          label: 'Email',
          value: 'invalid',
          required: false,
          validations: [[true, 'Invalid email domain']],
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('Invalid email domain')

      unmount(app)
    })
  })

  describe('PasswordInput', () => {
    it('toggles password visibility when toggle button is clicked', () => {
      const app = mount(PasswordInput, {
        target: container,
        props: {
          label: 'Password',
          value: 'secret123',
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('password')

      const toggleBtn = container.querySelector(
        'button[type="button"]',
      ) as HTMLButtonElement
      expect(toggleBtn).not.toBeNull()
      expect(toggleBtn.getAttribute('aria-label')).toBe('Show password')

      fireEvent.click(toggleBtn)
      flushSync()

      expect(input.type).toBe('text')
      expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password')

      fireEvent.focusOut(input)
      flushSync()

      expect(input.type).toBe('password')

      unmount(app)
    })

    it('sets custom validation message when password is empty and required', () => {
      const app = mount(PasswordInput, {
        target: container,
        props: {
          label: 'Password',
          required: true,
          value: '',
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('Please fill required fields.')

      unmount(app)
    })
  })

  describe('NumberInput', () => {
    it('renders number input and converts input value to number', () => {
      const numVal: number | string = 3
      const app = mount(NumberInput, {
        target: container,
        props: {
          label: 'Score',
          value: numVal,
          min: 0,
          max: 5,
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('number')
      expect(input.value).toBe('3')
      expect(input.min).toBe('0')
      expect(input.max).toBe('5')

      fireEvent.input(input, { target: { value: '4' } })
      flushSync()

      unmount(app)
    })

    it('handles empty input and sets custom validation message', () => {
      const app = mount(NumberInput, {
        target: container,
        props: {
          label: 'Age',
          required: true,
          value: '',
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('Please fill required fields.')

      unmount(app)
    })
  })

  describe('CheckboxInput', () => {
    it('renders checkbox and handles checked state', () => {
      const checked = false
      const app = mount(CheckboxInput, {
        target: container,
        props: {
          label: 'Accept Terms',
          value: checked,
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('checkbox')
      expect(input.checked).toBe(false)

      fireEvent.click(input)
      flushSync()

      unmount(app)
    })

    it('handles required validation for checkbox', () => {
      const app = mount(CheckboxInput, {
        target: container,
        props: {
          label: 'Agree',
          required: true,
          value: false,
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('Please fill required fields.')

      unmount(app)
    })
  })

  describe('DateTimeInput', () => {
    it('renders datetime-local input', () => {
      const app = mount(DateTimeInput, {
        target: container,
        props: {
          label: 'Meeting Time',
          value: '2026-08-03T14:00',
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('datetime-local')
      expect(input.value).toBe('2026-08-03T14:00')

      unmount(app)
    })

    it('handles custom validity validation for DateTimeInput', () => {
      const app = mount(DateTimeInput, {
        target: container,
        props: {
          label: 'Time',
          required: true,
          value: '',
        },
      })
      flushSync()

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.validationMessage).toBe('Please fill required fields.')

      unmount(app)
    })
  })

  describe('Textarea', () => {
    it('renders textarea with label, calculated height, and updates value', () => {
      const app = mount(Textarea, {
        target: container,
        props: {
          label: 'Feedback',
          value: 'Initial text',
          rows: 4,
          required: true,
          maxlength: 100,
        },
      })
      flushSync()

      const textarea = container.querySelector(
        'textarea',
      ) as HTMLTextAreaElement
      expect(textarea).not.toBeNull()
      expect(textarea.value).toBe('Initial text')
      expect(textarea.style.minHeight).toBe('7.5rem')
      expect(container.textContent).toContain('Feedback*')

      fireEvent.input(textarea, { target: { value: 'Updated feedback' } })
      flushSync()

      fireEvent.keyUp(textarea)
      flushSync()

      expect(container.textContent).toContain('16/100')

      unmount(app)
    })
  })

  describe('Button', () => {
    it('renders default button element with gray color', () => {
      const app = mount(Button, {
        target: container,
        props: {
          type: 'submit',
        },
      })
      flushSync()

      const btn = container.querySelector('button') as HTMLButtonElement
      expect(btn).not.toBeNull()
      expect(btn.type).toBe('submit')
      expect(btn.classList.contains('bg-gray-100')).toBe(true)

      unmount(app)
    })

    it('renders as anchor link when href is provided', () => {
      const app = mount(Button, {
        target: container,
        props: {
          href: '/dashboard',
          color: 'blue',
        },
      })
      flushSync()

      const link = container.querySelector('a') as HTMLAnchorElement
      expect(link).not.toBeNull()
      expect(link.getAttribute('href')).toBe('/dashboard')
      expect(link.getAttribute('role')).toBe('button')
      expect(link.classList.contains('bg-blue-100')).toBe(true)

      unmount(app)
    })

    it('renders all color variants', () => {
      const colors = ['red', 'blue', 'green', 'yellow', 'purple'] as const
      colors.forEach((color) => {
        const app = mount(Button, {
          target: container,
          props: { color },
        })
        flushSync()
        const btn = container.querySelector('button') as HTMLButtonElement
        expect(btn.classList.contains(`bg-${color}-100`)).toBe(true)
        unmount(app)
      })
    })
  })

  describe('Loading', () => {
    it('renders loading spinner with accessibility text', () => {
      const app = mount(Loading, {
        target: container,
        props: {
          class: 'h-64',
        },
      })
      flushSync()

      const status = container.querySelector('[role="status"]')
      expect(status).not.toBeNull()
      expect(container.textContent).toContain('Loading...')

      unmount(app)
    })
  })

  describe('Disclosure', () => {
    it('toggles open state and content when clicked', () => {
      const app = mount(Disclosure, {
        target: container,
        props: {},
      })
      flushSync()

      const btn = container.querySelector('button') as HTMLButtonElement
      expect(btn).not.toBeNull()

      fireEvent.click(btn)
      flushSync()

      unmount(app)
    })
  })

  describe('Card', () => {
    it('renders card container with custom class', () => {
      const app = mount(Card, {
        target: container,
        props: {
          class: 'my-card-class',
        },
      })
      flushSync()

      const div = container.firstElementChild as HTMLElement
      expect(div.classList.contains('my-card-class')).toBe(true)

      unmount(app)
    })
  })
})
