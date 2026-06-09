describe('Section B: Dashboard and Navigation Layout', () => {
  beforeEach(() => {
    // Ignore transient Firebase emulator connection exceptions
    Cypress.on('uncaught:exception', (err) => {
      if (
        err.message.includes('Connection failed') ||
        err.message.includes('Firebase')
      ) {
        return false
      }
      return true
    })

    // Authenticate as Admin using the optimized session command
    cy.signedInSession('admin')
    cy.visit('/dashboard')
    cy.get('h1').should('contain', 'Dashboard')
    cy.wait(1000) // Wait for stats to load
  })

  it('Test Case 6: Stats Verification and Clipboard Actions', () => {
    // Verify that the Applications card contains correct mock statistics structure
    cy.contains('h2', 'Applications')
      .parent()
      .within(() => {
        cy.contains('total instructor applications created.').should(
          'be.visible',
        )
        cy.contains('instructor apps submitted.').should('be.visible')
        cy.contains('instructor apps decided.').should('be.visible')
        cy.contains('students pre-registered.').should('be.visible')
        cy.contains('pre-registrations started.').should('be.visible')
        cy.contains('students enrolled.').should('be.visible')
      })

    // Stub clipboard interactions
    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })

    // Click "Copy Emails for Uncompleted Registrations"
    cy.contains('button', 'Copy Emails for Uncompleted Registrations').click()
    cy.get('@clipboardCopy').then((stub: any) => {
      expect(stub.called).to.equal(true)
      const text = stub.lastCall.args[0]
      cy.parseCopiedEmails(text).then((emails) => {
        expect(emails.slice(0, 5)).to.deep.equal([
          'student-0@gmail.com',
          'student-14@gmail.com',
          'student-21@gmail.com',
          'student-28@gmail.com',
          'student-7@gmail.com',
        ])
      })
    })
    cy.get('.bg-green-200').should(
      'contain',
      'Emails of uncompleted registrations copied to clipboard.',
    )

    // Click "Copy Emails for Uncompleted Applications"
    cy.contains('button', 'Copy Emails for Uncompleted Applications').click()
    cy.get('@clipboardCopy').then((stub: any) => {
      expect(stub.called).to.equal(true)
      const text = stub.lastCall.args[0]
      cy.parseCopiedEmails(text).then((emails) => {
        expect(emails.slice(0, 5)).to.deep.equal([
          'applicant-0@gmail.com',
          'applicant-12@gmail.com',
          'applicant-15@gmail.com',
          'applicant-18@gmail.com',
          'applicant-21@gmail.com',
        ])
      })
    })
    cy.get('.bg-green-200').should(
      'contain',
      'Emails of uncompleted applications copied to clipboard.',
    )

    // Click "View Announcements" and assert redirect
    cy.contains('a', 'View Announcements').click()
    cy.url().should('include', '/announcements')
    cy.get('h1').should('contain', 'Announcements')
  })

  it('Test Case 7: Classes Today Alerts and Reminders', () => {
    // Verify class list items are rendered under Classes Today
    cy.contains('h2', 'Classes Today')
      .parent()
      .within(() => {
        // bg-blue-100: ClassUpcomingSoon
        cy.get('.bg-blue-100').should('be.visible').and('contain', 'Python 1')

        // bg-yellow-100: FeedbackIncomplete
        cy.get('.bg-yellow-100')
          .should('be.visible')
          .and('contain', 'Scratch 1')

        // bg-red-100: ClassNotHeld
        cy.get('.bg-red-100').should('be.visible')

        // bg-green-100: EverythingComplete
        cy.get('.bg-green-100').should('be.visible')
      })

    // Click Send Instructor Reminder on an item
    cy.on('window:confirm', () => true)
    cy.contains('h2', 'Classes Today')
      .parent()
      .within(() => {
        cy.get('.bg-blue-100')
          .find('button')
          .contains('Send Instructor Reminder')
          .click()
      })

    // Verify success alert triggers
    cy.get('.bg-green-200').should('contain', 'A reminder email was sent!')
  })
})
