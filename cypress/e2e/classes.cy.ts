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
    cy.signedInSession('admin')
    cy.visit('/classes')
    cy.title().should('contain', 'Classes')
    cy.wait(1000) // Wait for classes to load
  })

  it('Test Case 12: Classes Search, Filters, and Email Export', () => {
    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Python I')
      expect($table).to.contain('Scratch')
    })

    // Select "Python I" from Course filter dropdown
    cy.get('input[name="course"]').clear().type('Python I')
    cy.wait(200)
    cy.get('input[name="course"]').type('{enter}')
    cy.wait(500)

    // Table should contain Python I classes only
    cy.get('table').should(($table) => {
      // Ensure Scratch is filtered out and Python I stays
      expect($table).to.not.contain('Scratch')
      expect($table).to.contain('Python I')
    })

    // Stub clipboard
    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })

    // Click "Copy Emails" button
    cy.contains('button', 'Copy Emails').click()
    cy.get('@clipboardCopy').should('have.been.called')
    cy.get('.bg-green-200').should('contain', 'copied to clipboard')

    // Verify Download button links to a CSV Blob
    // TODO for this and all other CSV blob tests, check 1 expected row in the result.
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')
  })

  it('Test Case 13: Class Details Modal Actions', () => {
    // Open modal for Python I class taught by Demo Instructor
    cy.contains('tr', 'Demo Instructor').click()
    cy.get('[role="dialog"]').should('exist')

    // Verify Class List columns
    cy.get('table').should('exist')
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
    cy.get('@clipboardCopy').should('have.been.called')
    cy.get('.bg-green-200').should('contain', 'copied to clipboard')

    // Click reminders (trigger alert)
    cy.on('window:confirm', () => true)
    cy.contains('button', 'Send Reminder To All Students').click()
    cy.wait(500)
    cy.get('body').then(($body) => {
      if ($body.find('.bg-red-200').length > 0) {
        cy.get('.bg-red-200').should('contain', 'No upcoming classes')
      } else {
        cy.get('.bg-green-200').should('contain', 'sent')
      }
    })

    cy.contains('button', 'Send Instructor Reminder').click()
    cy.wait(500)
    cy.get('body').then(($body) => {
      if ($body.find('.bg-red-200').length > 0) {
        cy.get('.bg-red-200').should('contain', 'No upcoming classes')
      } else {
        cy.get('.bg-green-200').should('contain', 'sent')
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
    cy.get('.bg-green-200').should(
      'contain',
      'Changes were saved successfully.',
    )

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
