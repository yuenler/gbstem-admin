describe('Section G: Pre-Registrations Directory', () => {
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
    cy.visit('/registrations')
    cy.title().should('contain', 'Registrations')
    cy.wait(1000) // Wait for registrations to load
  })

  it('Test Case 15: Filter, Search, and Edit Pre-Registrations', () => {
    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Charlie Brown')
      expect($table).to.contain('Sally Brown')
    })

    // Search for Charlie
    cy.get('input[placeholder="Search"]').clear().type('Charlie{enter}')
    cy.wait(500)

    // Table should contain Charlie Brown
    cy.get('table').should(($table) => {
      // Verify Sally gets filtered out and Charlie stays
      expect($table).to.not.contain('Sally Brown')
      expect($table).to.contain('Charlie Brown')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table').should(($table) => {
      // Verify both Sally and Charlie show up again
      expect($table).to.contain('Sally Brown')
      expect($table).to.contain('Charlie Brown')
    })

    // Verify Per Page dropdown functionality
    cy.get('input[name="per-page"]').should('have.value', '25')
    cy.selectOption('input[name="per-page"]', '50')
    cy.url().should('contain', 'limit=50')
    cy.get('input[name="per-page"]').should('have.value', '50')

    // Select "submitted" from Status filter dropdown
    cy.selectOption('input[name="status"]', 'incomplete')
    cy.get('table').should(($table) => {
      // Verify Charlie gets filtered out and Mark stays
      expect($table).to.not.contain('Charlie Brown')
      expect($table).to.contain('Mark Lewis')
    })

    cy.selectOption('input[name="status"]', 'all')
    cy.get('table').should(($table) => {
      // Verify Charlie gets restored and Mark stays
      expect($table).to.contain('Charlie Brown')
      expect($table).to.contain('Mark Lewis')
    })

    // Verify Download button links to a CSV Blob
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')

    // Toggle Bypass Age Limits on Charlie Brown's row
    // Charlie Brown row's bypass checkbox is in column 9 (index 8)
    cy.contains('tr', 'Charlie Brown')
      .scrollIntoView()
      .within(() => {
        cy.get('td').eq(8).find('input[type="checkbox"]').as('bypassCheckbox')
      })
    cy.get('@bypassCheckbox').should('exist')

    // Click it to toggle
    cy.get('@bypassCheckbox').click()
    cy.get('.bg-green-200', { timeout: 15000 }).should(
      'contain',
      'Bypass age limits updated successfully.',
    )

    // Open Registration details modal for Charlie Brown
    cy.contains('td', 'Charlie Brown').click()
    cy.get('[role="dialog"]').should('exist')

    // Click Edit on the sticky header
    cy.contains('button', 'Edit').click()
    cy.contains('button', 'Save changes').should('be.visible')

    // Change student grade from 4 to 5
    cy.get('input[name="student-grade"]')
      .scrollIntoView()
      .clear({ force: true })
      .type('5', { force: true })

    // Click Save changes
    cy.contains('button', 'Save changes').scrollIntoView().click()
    cy.get('.bg-green-200', { timeout: 10000 }).should(
      'contain',
      'Changes were saved successfully.',
    )

    // Close dialog
    cy.contains('button', 'Close').click()
    cy.get('[role="dialog"]').should('not.exist')

    // Re-verify grade on the table row
    cy.contains('tr', 'Charlie Brown').within(() => {
      cy.get('td').eq(5).should('contain', '5')
    })
  })
})
