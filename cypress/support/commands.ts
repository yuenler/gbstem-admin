// Add all new commands to index.d.ts as well.
import Papa from 'papaparse'

Cypress.Commands.add('fillInput', (selector: string, text: string) => {
  cy.get(selector)
    .scrollIntoView()
    .should('be.visible')
    .focus()
    .clear()
    .type(text, { delay: 20 })
  // We had buggy inputs in the past, verify the value actually stuck.
  cy.get(selector).should('have.value', text)
})

// Type a term into a SearchBox and submit it.
//
// Typing here is racy: `Input.svelte` re-renders on every `value` change, so
// Svelte can replace the input element mid-`.type()`. Cypress keeps typing into
// the node it resolved when the command started, the replaced node keeps only
// the final keystroke, and the form submits that. CI caught this submitting
// `query=d` for a typed "David" -- and a single letter matches nearly every
// record, since the local search fallback substring-matches every field, so the
// filter assertions failed in a way that looked like a slow load but never
// resolved no matter how long the timeout.
//
// fillInput already re-types when the value doesn't stick, so reuse it, then
// assert the query reached the URL before any table assertions run.
Cypress.Commands.add('submitSearch', (term: string) => {
  const selector = 'input[placeholder="Search"]'
  cy.fillInput(selector, term)
  cy.get(selector).type('{enter}')
  // Build the expectation the same way SearchBox does, via URLSearchParams --
  // it encodes a space as "+", which encodeURIComponent would render as "%20"
  // and never match for multi-word terms like "Demo Student".
  cy.url().should('include', new URLSearchParams({ query: term }).toString())
})

Cypress.Commands.add(
  'signedInSession',
  (
    role: 'admin' | 'instructor' | 'reviewer' | 'student',
    options: {
      email?: string
      initialPage?: string
    } = {},
  ) => {
    const emailToUse =
      options.email ||
      (role === 'admin' ? 'demo@gbstem.org' : `${role}@gbstem.org`)

    cy.session(`signedIn-${emailToUse}`, () => {
      cy.visit('/signin')
      cy.get('input[type="email"]').should('be.visible')
      cy.wait(2500) // Wait for Svelte page and HMR to settle
      const password = 'penguin'

      cy.fillInput('input[type="email"]', emailToUse)
      cy.fillInput('input[type="password"]', password)
      cy.get('button[type="submit"]').click()
      cy.wait(1000) // Wait for Svelte page and HMR to settle
    })

    const initialPage = options.initialPage || '/dashboard'
    cy.visit(initialPage)
    if (initialPage === '/announcements') {
      cy.title().should('contain', 'Announcements')
      cy.get('h1').should('contain', 'Announcements', { timeout: 10000 })
    } else if (initialPage === '/applications') {
      cy.title().should('contain', 'Applications')
    } else if (initialPage === '/classes') {
      cy.title().should('contain', 'Classes')
    } else if (initialPage === '/instructor-feedback') {
      cy.title().should('contain', 'Class Feedback')
    } else if (initialPage === '/interviews') {
      cy.title().should('contain', 'Interview Timeslots')
      cy.get('h1').should('contain', 'Set Interview Timeslots', {
        timeout: 10000,
      })
    } else if (initialPage === '/registrations') {
      cy.title().should('contain', 'Registrations')
    } else if (initialPage === '/student-feedback') {
      cy.title().should('contain', 'Student Feedback')
    } else if (initialPage === '/students') {
      cy.title().should('contain', 'Students')
    } else if (initialPage === '/sub-requests') {
      cy.title().should('contain', 'Sub Requests Log')
    } else if (initialPage === '/dashboard') {
      cy.title().should('contain', 'Dashboard')
      cy.get('h1').should('contain', 'Dashboard', { timeout: 10000 })
    } else if (initialPage === '/profile') {
      cy.title().should('contain', 'Profile')
      cy.get('h1').should('contain', 'Profile', { timeout: 10000 })
    } else if (initialPage === '/tokens') {
      cy.title().should('contain', 'Tokens')
    } else if (initialPage.startsWith('/user/')) {
      cy.title().should('contain', 'Check In')
    }
    cy.wait(1000)
  },
)

Cypress.Commands.add('signOutViaUi', () => {
  cy.get('body').then(($body) => {
    if ($body.find('button[aria-label="Profile menu"]:visible').length > 0) {
      cy.get('button[aria-label="Profile menu"]').click()
    }
  })
  cy.contains('button', 'Sign out').click({ force: true })
  cy.url().should('include', '/signin')
  cy.get('input[type="email"]').should('be.visible')
})

// Select.svelte debounces its dropdown filtering by 150ms (see Select.svelte),
// so instead of guessing that delay with a fixed wait, click the rendered
// option button once it appears -- the click() at the end of this chain
// retries the whole query until the (debounced) option shows up.
Cypress.Commands.add('selectOption', (selector: string, text: string) => {
  cy.get(selector).then(($el) => {
    const el = $el[0] as HTMLInputElement
    el.value = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  cy.get(selector).parent().find('button').contains(text).click({
    force: true,
  })
})

Cypress.Commands.add('parseCsv', (csvText: string) => {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  })
  return cy.wrap(parsed.data)
})

Cypress.Commands.add('parseCopiedEmails', (clipboardText: string) => {
  const emails = clipboardText.split(',').map((e: string) => e.trim())
  return cy.wrap(emails)
})

Cypress.Commands.add(
  'dropCsvColumn',
  (parsedRows: string[][], columnName: string) => {
    const headers = parsedRows[0]
    const colIndex = headers.indexOf(columnName)
    if (colIndex === -1) {
      throw new Error(
        `Column "${columnName}" not found in CSV headers: ${headers.join(', ')}`,
      )
    }
    const updatedRows = parsedRows.map((row) => {
      return [...row.slice(0, colIndex), ...row.slice(colIndex + 1)]
    })
    return cy.wrap(updatedRows)
  },
)

Cypress.Commands.add(
  'getLatestOobLink',
  (
    email: string,
    requestType: 'VERIFY_EMAIL' | 'PASSWORD_RESET' | 'VERIFY_AND_CHANGE_EMAIL',
  ) => {
    return cy.request('GET', '/api/test/emails').then((response) => {
      const sentEmails = response.body || []
      const match = sentEmails
        .filter((msg: any) => {
          const toMatch = Array.isArray(msg.to)
            ? msg.to.includes(email)
            : msg.to === email
          const subjectMatch =
            (requestType === 'VERIFY_EMAIL' &&
              msg.subject.includes('Verify Email')) ||
            (requestType === 'PASSWORD_RESET' &&
              msg.subject.includes('Reset Password')) ||
            (requestType === 'VERIFY_AND_CHANGE_EMAIL' &&
              msg.subject.includes('Change Email'))
          return toMatch && subjectMatch
        })
        .pop()
      expect(
        match,
        `Expected an email to be sent to ${email} for ${requestType}`,
      ).to.not.equal(undefined)
      const linkMatch = match.html.match(
        /href=["'](https?:\/\/[^"']+\/action?[^"']+&amp;oobCode=[^"']+)["']/,
      )
      expect(
        linkMatch,
        'Expected sent email body to contain an action link URL',
      ).to.not.equal(null)
      const rawLink = linkMatch[1]
      const link = rawLink.replace(/&amp;/g, '&')
      return link
    })
  },
)

Cypress.Commands.add('clearTestEmails', () => {
  return cy.request('DELETE', '/api/test/emails')
})

Cypress.Commands.add(
  'verifyEmailSent',
  (email: string, subjectSubstring: string, timeoutMs: number = 10000) => {
    // The send is triggered server-side by the write that preceded this call
    // (e.g. a decision update), so the email may not have landed in the test
    // inbox yet -- poll for it instead of assuming the caller waited long
    // enough before calling this command.
    const deadline = Date.now() + timeoutMs
    const findMatch = (sentEmails: any[]) =>
      sentEmails
        .filter((msg: any) => {
          const toMatch = Array.isArray(msg.to)
            ? msg.to.includes(email)
            : msg.to === email
          const subjectMatch = msg.subject.includes(subjectSubstring)
          return toMatch && subjectMatch
        })
        .pop()
    const attempt = (): Cypress.Chainable<any> =>
      cy.request('GET', '/api/test/emails').then((response) => {
        const match = findMatch(response.body || [])
        if (match) return cy.wrap(match)
        if (Date.now() >= deadline) {
          expect(
            match,
            `Expected an email sent to ${email} with subject containing "${subjectSubstring}"`,
          ).to.not.equal(undefined)
        }
        return cy.wait(250, { log: false }).then(attempt)
      })
    return attempt()
  },
)

Cypress.Commands.add(
  'waitForNotification',
  (
    text: string,
    colorClass: string = 'bg-green-200',
    timeoutMs: number = 15000,
  ) => {
    return cy
      .get(`.${colorClass}`, { timeout: timeoutMs })
      .should('contain', text)
  },
)
