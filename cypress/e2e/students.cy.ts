describe('Section F: Students Directory', () => {
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
    cy.visit('/students')
    cy.title().should('contain', 'Students')
    cy.wait(1000) // Wait for students list to load
  })

  it('Test Case 14: Students Search, Filtering, and Enrolling/Dropping Classes', () => {
    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Charlie Brown')
      expect($table).to.contain('Sally Brown')
    })

    // Search for Charlie
    cy.get('input[placeholder="Search"]').clear().type('Charlie{enter}')
    cy.get('table').should(($table) => {
      // Verify Sally gets filtered out and Charlie stays
      expect($table).to.not.contain('Sally Brown')
      expect($table).to.contain('Charlie Brown')
    })

    // Click Charlie Brown's row to open details modal
    cy.contains('td', 'Charlie Brown').click()
    cy.get('[role="dialog"]').should('exist')

    // Enroll Charlie in "Python I"
    // eq(0) is the Add Class dropdown
    cy.get('input[name="select-a-class"]', { timeout: 15000 })
      .eq(0)
      .clear()
      .type('Python I')
    cy.wait(500)
    cy.get('input[name="select-a-class"]')
      .eq(0)
      .parent()
      .parent()
      .find('button')
      .contains('Python I')
      .click({ force: true })
    cy.wait(200)

    // Click Add Class
    cy.contains('button', 'Add Class').click({ force: true })
    cy.get('.bg-green-200', { timeout: 10000 }).should(
      'contain',
      'Enrolled in class successfully!',
    )
    cy.wait(500)

    // Class 1 Information should appear
    cy.contains('h2', 'Class 1 Information').should('exist')
    cy.contains('td', 'Python I').should('exist')

    // Drop the class
    // eq(1) is the Drop Class dropdown
    cy.get('input[name="select-a-class"]', { timeout: 15000 })
      .eq(1)
      .clear()
      .type('Python I')
    cy.wait(500)
    cy.get('input[name="select-a-class"]')
      .eq(1)
      .parent()
      .parent()
      .find('button')
      .contains('Python I')
      .click({ force: true })
    cy.wait(200)

    // Click Drop Class
    cy.contains('button', 'Drop Class').click({ force: true })
    cy.get('.bg-green-200', { timeout: 10000 }).should(
      'contain',
      'Dropped class successfully!',
    )
    cy.wait(500)

    // Class 1 Information should no longer exist
    cy.contains('h2', 'Class 1 Information').should('not.exist')

    // Close the details modal
    cy.contains('button', 'Close').click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')
  })
})
