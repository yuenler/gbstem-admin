describe('Section I: Feedback Views', () => {
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
  })

  it('Test Case 17: Audit Student Feedback', () => {
    cy.visit('/student-feedback')
    cy.url().should('include', '/student-feedback')
    cy.title().should('contain', 'Student Feedback')
    cy.wait(1000)

    // Verify columns
    cy.get('th').contains('Student Name').should('be.visible')
    cy.get('th').contains('Course').should('be.visible')
    cy.get('th').contains('Instructor Name').should('be.visible')
    cy.get('th').contains('Date').should('be.visible')
    cy.get('th').contains('Feedback').should('be.visible')
    cy.get('th').contains('Rating').should('be.visible')

    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Christopher Lee')
      expect($table).to.contain('Charles Jackson')
    })

    // Search by student name
    cy.get('input[placeholder="Search"]').clear().type('Christopher{enter}')
    cy.get('table').should(($table) => {
      // Verify Charles gets filtered out and Christopher stays
      expect($table).to.not.contain('Charles Jackson')
      expect($table).to.contain('Christopher Lee')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table').should(($table) => {
      // Verify both Charles and Christopher show up again
      expect($table).to.contain('Charles Jackson')
      expect($table).to.contain('Christopher Lee')
    })

    // Filter by course
    cy.selectOption('input[name="course"]', 'Python 1')
    cy.get('table').should(($table) => {
      // Verify Christopher gets filtered out and John stays
      expect($table).to.not.contain('Christopher Lee')
      expect($table).to.contain('John Williams')
    })

    // Verify Download button links to a CSV Blob
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')
  })

  it('Test Case 18: Audit Instructor Feedback and View Details', () => {
    cy.visit('/instructor-feedback')
    cy.url().should('include', '/instructor-feedback')
    cy.title().should('contain', 'Class Feedback') // The title is Class Feedback or similar
    cy.wait(1000)

    // Verify columns
    cy.get('th').contains('Instructor Name').should('be.visible')
    cy.get('th').contains('Course').should('be.visible')
    cy.get('th').contains('Class Number').should('be.visible')
    cy.get('th').contains('Date').should('be.visible')
    cy.get('th').contains('Attendance Percent').should('be.visible')
    cy.get('th').contains('Feedback').should('be.visible')

    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Karen Martin')
      expect($table).to.contain('Charles Jackson')
    })

    // Search by instructor name
    cy.get('input[placeholder="Search"]').clear().type('Karen{enter}')
    cy.get('table').should(($table) => {
      // Ensure Charles gets filtered out and Karen stays
      expect($table).to.not.contain('Charles Jackson')
      expect($table).to.contain('Karen Martin')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table').should(($table) => {
      // Verify both Charles and Karen show up again
      expect($table).to.contain('Charles Jackson')
      expect($table).to.contain('Karen Martin')
    })

    // Filter by course
    cy.selectOption('input[name="course"]', 'Python 1')
    cy.get('table').should(($table) => {
      // Verify Karen gets filtered out and Mary stays
      expect($table).to.not.contain('Karen Martin')
      expect($table).to.contain('Mary Johnson')
    })

    // Click on feedback row to open modal
    cy.get('table').find('tbody').find('tr').eq(0).click()
    cy.get('[role="dialog"]').should('exist')

    // Close the details modal using exact regex matching
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')

    // Verify Download button links to a CSV Blob
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')
  })
})
