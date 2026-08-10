describe('Section E: Classes Directory', () => {
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

    // Authenticate as Admin
    cy.signedInSession('admin', { initialPage: '/classes' })
  })

  it('Test Case 12: Classes Search, Filters, and Email Export', () => {
    // Verify initial state
    cy.get('table', { timeout: 10000 }).should(($table) => {
      expect($table).to.contain('Python 1')
      expect($table).to.contain('Scratch 1')
    })

    // Select "Python 1" from Course filter dropdown
    cy.get('input[name="course"]').clear().type('Python 1')
    cy.wait(200)
    cy.get('input[name="course"]').type('{enter}')
    cy.wait(500)

    // Table should contain Python 1 classes only
    cy.get('table', { timeout: 10000 }).should(($table) => {
      // Ensure Scratch is filtered out and Python 1 stays
      expect($table).to.not.contain('Scratch 1')
      expect($table).to.contain('Python 1')
    })

    // Stub clipboard
    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })

    // Click "Copy Emails" button
    cy.contains('button', 'Copy Emails').click()
    cy.get('@clipboardCopy').then((stub: any) => {
      expect(stub.called).to.equal(true)
      const text = stub.lastCall.args[0]
      cy.parseCopiedEmails(text).then((emails) => {
        expect(emails.slice(0, 5)).to.deep.equal([
          'instructor-fake-11@gbstem.org',
          'instructor-fake-16@gbstem.org',
          'instructor-fake-1@gbstem.org',
          'instructor-fake-21@gbstem.org',
          'instructor-fake-26@gbstem.org',
        ])
      })
    })
    cy.waitForNotification('copied to clipboard')

    // Verify Download button links to a CSV Blob
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')
      .then((href) => {
        cy.window().then((win) => {
          return win.fetch(href).then((resRes: Response) => resRes.text())
        })
      })
      .then((text) => {
        cy.parseCsv(text).then((parsedRows) => {
          const headers = parsedRows[0]
          expect(headers).to.deep.equal([
            'id',
            'name',
            'email',
            'class',
            'students',
            'classes complete',
            'classes missing feedback',
            'classes missed',
            'meeting link',
            'class times',
          ])
          const first5Rows = parsedRows.slice(1, 6)
          expect(first5Rows).to.deep.equal([
            [
              'class-fake-1',
              'Mary Johnson',
              'instructor-fake-1@gbstem.org',
              'Python 1',
              'student-fake-1',
              '1',
              '0',
              '0',
              'https://zoom.us/j/123456789',
              'Monday at 4:00 PM, Wednesday at 4:00 PM',
            ],
            [
              'class-fake-11',
              'Barbara Lopez',
              'instructor-fake-11@gbstem.org',
              'Python 1',
              'student-fake-11',
              '0',
              '0',
              '0',
              'https://zoom.us/j/123456789',
              'Monday at 4:00 PM, Wednesday at 4:00 PM',
            ],
            [
              'class-fake-16',
              'Thomas Taylor',
              'instructor-fake-16@gbstem.org',
              'Python 1',
              'student-fake-16',
              '0',
              '0',
              '0',
              'https://zoom.us/j/123456789',
              'Monday at 4:00 PM, Wednesday at 4:00 PM',
            ],
            [
              'class-fake-21',
              'Nancy Perez',
              'instructor-fake-21@gbstem.org',
              'Python 1',
              'student-fake-21',
              '0',
              '0',
              '0',
              'https://zoom.us/j/123456789',
              'Monday at 4:00 PM, Wednesday at 4:00 PM',
            ],
            [
              'class-fake-26',
              'Anthony Clark',
              'instructor-fake-26@gbstem.org',
              'Python 1',
              'student-fake-26',
              '0',
              '0',
              '0',
              'https://zoom.us/j/123456789',
              'Monday at 4:00 PM, Wednesday at 4:00 PM',
            ],
          ])
        })
      })
  })

  it('Test Case 13: Class Details Modal Actions', () => {
    // Open modal for Python 1 class taught by Demo Instructor
    cy.contains('tr', 'Demo Instructor').click()
    cy.get('[role="dialog"]').should('exist')

    // Verify Class List columns
    cy.get('table', { timeout: 10000 }).should('exist')
    cy.get('th').contains('Student Name').should('exist')
    cy.get('th').contains('Email').should('exist')
    cy.get('th').contains('Secondary Email').should('exist')
    cy.get('th').contains('Phone').should('exist')
    cy.get('th').contains('Grade').should('exist')
    cy.get('th').contains('School').should('exist')

    // Wait for student list to load asynchronously from Firestore
    cy.get('[role="dialog"]').contains('td', 'Demo Student One').should('exist')

    // Stub clipboard
    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })

    // Click Copy button inside class details
    cy.get('[role="dialog"]').contains('button', 'Copy').click()
    cy.get('@clipboardCopy').then((stub: any) => {
      expect(stub.called).to.equal(true)
      const text = stub.lastCall.args[0]
      cy.parseCopiedEmails(text).then((emails) => {
        expect(emails).to.deep.equal(['student@gbstem.org'])
      })
    })
    cy.waitForNotification('copied to clipboard')

    // Click reminders (trigger alert)
    cy.on('window:confirm', () => true)
    cy.contains('button', 'Send Reminder To All Students').click()
    cy.wait(500)
    cy.get('body').then(($body) => {
      if ($body.find('.bg-red-200').length > 0) {
        cy.get('.bg-red-200').should('contain', 'No upcoming classes')
      } else {
        cy.waitForNotification('sent')
        cy.verifyEmailSent('student@gbstem.org', 'gbSTEM Class Reminder')
      }
    })

    cy.contains('button', 'Send Instructor Reminder').click()
    cy.wait(500)
    cy.get('body').then(($body) => {
      if ($body.find('.bg-red-200').length > 0) {
        cy.get('.bg-red-200').should('contain', 'No upcoming classes')
      } else {
        cy.waitForNotification('sent')
        cy.verifyEmailSent(
          'instructor@gbstem.org',
          'gbSTEM Class Teaching Reminder',
        )
      }
    })

    // Edit capacity
    cy.contains('button', 'Edit').click()

    // Generate a random capacity to ensure we verify write success
    const newCapacity = Math.floor(Math.random() * 50) + 15
    cy.get('input[name="class-capacity"]').then(($el) => {
      $el.val(newCapacity)
      $el[0].dispatchEvent(new Event('input', { bubbles: true }))
    })
    cy.get('input[name="class-capacity"]').should(
      'have.value',
      String(newCapacity),
    )

    // Click Save changes
    cy.contains('button', 'Save changes').click()
    cy.waitForNotification('Changes were saved successfully.')

    // Close and reopen to verify capacity saved
    cy.contains('button', 'Close').click()
    cy.get('[role="dialog"]').should('not.exist')

    cy.contains('tr', 'Demo Instructor').click()
    cy.get('[role="dialog"]').should('exist')
    cy.get('input[name="class-capacity"]').should(
      'have.value',
      String(newCapacity),
    )

    // Close modal
    cy.contains('button', 'Close').click()
  })
})
