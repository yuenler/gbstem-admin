import type { ClassValue } from 'clsx'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import { alert } from '$lib/stores'

export function cn(...classes: Array<ClassValue>) {
  return twMerge(clsx(...classes))
}

export function clickOutside(node: HTMLElement) {
  function handleClick(e: MouseEvent) {
    if (!node.contains(e.target as HTMLElement)) {
      node.dispatchEvent(new CustomEvent('outclick'))
    }
  }
  document.addEventListener('click', handleClick, true)
  return {
    destroy() {
      document.removeEventListener('click', handleClick, true)
    },
  }
}

export function trapFocus(node: HTMLElement) {
  const previous = document.activeElement as HTMLElement
  function focusable() {
    return Array.from(
      node.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as NodeListOf<HTMLElement>,
    )
  }
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return
    const current = document.activeElement
    const elements = focusable()
    const first = elements.at(0) as HTMLElement
    const last = elements.at(-1) as HTMLElement
    if (event.shiftKey && current === first) {
      last.focus()
      event.preventDefault()
    }
    if (!event.shiftKey && current === last) {
      first.focus()
      event.preventDefault()
    }
  }
  focusable()[0]?.focus()
  node.addEventListener('keydown', handleKeyDown)
  return {
    destroy() {
      node.removeEventListener('keydown', handleKeyDown)
      previous?.focus()
    },
  }
}

export function addDataToHtmlTemplate(html, template) {
  const htmlBody = html.replace(/{{(.*?)}}/g, (_, key) => {
    const keys = key.trim().split('.');
    let value = template.data;
    for (const k of keys) {
      value = value[k];
      if (value === undefined) {
        return '';
      }
    }
    return value;
  });
  return htmlBody;
}

export function formatTime24to12(time24: string): string {
  // Split the string by ":" to obtain hours and minutes
  const [hours24, minutes] = time24.split(':')

  // Parse the hours and minutes to integers
  const hours24Int = parseInt(hours24, 10)
  const minutesInt = parseInt(minutes, 10)

  // Create a date object at January 1, 2000, at the specified hours and minutes
  const date = new Date(2000, 0, 1, hours24Int, minutesInt)

  // Return the formatted time string in 12-hour format with AM/PM
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })
}

export function formatClassTimes(
  classDays: string[],
  classTimes: string[],
): string[] {
  return classDays.map(
    (day, index) => `${day} at ${formatTime24to12(classTimes[index])}`,
  )
}

export const formatDate = (date: Date) => {
  return date.toLocaleString('en-US', {
    weekday: 'long', // long, short, narrow
    month: 'long', // numeric, 2-digit, long, short, narrow
    day: 'numeric', // numeric, 2-digit
    hour: 'numeric', // numeric, 2-digit
    minute: 'numeric', // numeric, 2-digit
    hour12: true, // use 12-hour time format with AM/PM
  })
}

export function formatDateString(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateLocal(date: Date | string) {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export const formatDateShort = (date: Date) => {
  return date.toLocaleString('en-US', {
    weekday: 'short', // long, short, narrow
    month: 'short', // numeric, 2-digit, long, short, narrow
    day: 'numeric', // numeric, 2-digit
  })
}

export const timestampToDate = (timestamp: Timestamp | Date) => {
  return new Date(timestamp.seconds * 1000)
}

export const classHeldToday = (datesHeld: Date[], classTimeToday: Date) => {
  return datesHeld.filter((date) => new Date().toDateString() === timestampToDate(date).toDateString() && new Date() > date).length > 0 || timestampToDate(classTimeToday) > new Date()
}

export const isClassUpcoming = (date: Date) => {
  return date.getTime() > Date.now() && Math.abs(date.getTime() - new Date().getTime()) / (1000*60) < 30
}

export function normalizeCapitals(name: string) {
  return name.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export const getNearestFutureClass = (meetingTimes: Date[]) => {
   const nextIndex = meetingTimes.findIndex(schedule => new Date(timestampToDate(schedule)) > new Date())
   return nextIndex === -1 ? 'No Upcoming Classes' : formatDate(timestampToDate(meetingTimes[nextIndex]))
}

export const getNearestFutureClassIndex = (meetingTimes: Date[]) => {
  return meetingTimes.findIndex(schedule => new Date(timestampToDate(schedule)) > new Date())
}

export function copyEmails(email: string) {
  navigator.clipboard
    .writeText(email)
    .then(() => {
      alert.trigger('success', 'Emails copied to clipboard!')
    })
    .catch((err) => {
      alert.trigger('error', 'Failed to copy emails to clipboard!')
    })
}

export function toLocalISOString(date: Date) {
  const pad = (number: number) => (number < 10 ? '0' + number : number)

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1) // JavaScript months are 0-indexed.
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hour}:${minute}`.slice(0, 16)
}
