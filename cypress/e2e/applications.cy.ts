describe('Section D: Instructor Applications Management', () => {
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
    cy.visit('/applications')
    cy.title().should('contain', 'Applications')
    cy.wait(1000) // Wait for applications list to load
  })

  it('Test Case 9: Filter, Search, and Download Applications Table', () => {
    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('David Miller')
      expect($table).to.contain('Mark Lewis')
    })

    // Search for "David"
    cy.get('input[placeholder="Search"]').clear().type('David{enter}')
    cy.get('table').should(($table) => {
      // Ensure Mark disappears and David stays
      expect($table).to.not.contain('Mark Lewis')
      expect($table).to.contain('David Miller')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table').should(($table) => {
      // Ensure Mark re-appears
      expect($table).to.contain('Mark Lewis')
      expect($table).to.contain('David Miller')
    })

    // Select "Fall 2025" from Collection dropdown
    cy.get('input[name="collection"]').clear().type('Fall 2025')
    cy.wait(200)
    cy.get('input[name="collection"]').type('{enter}')
    cy.wait(500)
    cy.get('table').should(($table) => {
      // Verify no applications from Spring 2026 remain
      expect($table).to.not.contain('David Miller')
      expect($table).to.not.contain('Mark Lewis')
    })

    // Switch back to Spring 2026 to see the applications again
    cy.get('input[name="collection"]').clear().type('Spring 2026')
    cy.wait(200)
    cy.get('input[name="collection"]').type('{enter}')
    cy.wait(500)
    cy.get('table').should(($table) => {
      // Ensure applications from Spring 2026 reappear
      expect($table).to.contain('David Miller')
      expect($table).to.contain('Mark Lewis')
    })

    // Select "undecided" from Decision dropdown
    cy.get('input[name="decision"]').clear().type('undecided')
    cy.wait(200)
    cy.get('input[name="decision"]').type('{enter}')
    cy.wait(500)
    cy.get('table').should(($table) => {
      // Ensure demo instructor is removed and David stays
      expect($table).to.not.contain('Demo Instructor')
      expect($table).to.contain('David Miller')
    })

    // Verify Download button links to a CSV Blob
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')
  })

  it('Test Case 10: Bulk Application Decisions', () => {
    // Check all applications
    cy.get('#check-all').check()
    cy.get('[id^="check-"]').should('be.checked')

    // Bulk actions bar should appear in navigation bar with action buttons
    cy.contains('button', 'Interview').should('exist')
    cy.contains('button', 'Accept').should('exist')
    cy.contains('button', 'Substitute').should('exist')
    cy.contains('button', 'Waitlist').should('exist')
    cy.contains('button', 'Reject').should('exist')

    // Uncheck header checkbox
    cy.get('#check-all').uncheck()
    cy.get('[id^="check-"]').should('not.be.checked')

    // Check two rows individually
    cy.get('#check-0').check()
    cy.get('#check-1').check()

    // Actions bar should update counts
    cy.contains('button', 'Interview 2 applicants').should('exist')
    cy.contains('button', 'Accept 2 applicants').should('exist')

    // Click Close to clear selection
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[id^="check-"]').should('not.be.checked')
    cy.contains('button', 'Accept').should('not.exist')
  })

  it('Test Case 11: Application Details Modal and Decision Updates', () => {
    // Open application modal for David Miller
    cy.contains('td', 'David Miller').click()
    cy.get('[role="dialog"]').should('exist')

    // Click Likely Yes
    cy.contains('button', 'Likely Yes').click({ force: true })

    // Close the details modal
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')

    // David Miller's row should now have the green check icon (text-green-300) in the Likely Decision column
    cy.contains('tr', 'David Miller').within(() => {
      cy.get('.text-green-300').should('be.visible')
    })

    // Re-open David Miller
    cy.contains('td', 'David Miller').click()
    cy.get('[role="dialog"]').should('exist')

    // Click Accept and confirm
    cy.on('window:confirm', () => true)
    cy.contains('button', 'Accept').click({ force: true })

    // Wait for update
    cy.wait(500)

    // Close the modal
    cy.contains('button', /^Close$/).click({ force: true })

    // Row should show accepted decision (green check icon in Decision column)
    cy.contains('tr', 'David Miller').within(() => {
      // It should have two text-green-300 icons now (Likely Yes and Accepted Decision)
      cy.get('.text-green-300').should('have.length', 2)
    })
  })
})
