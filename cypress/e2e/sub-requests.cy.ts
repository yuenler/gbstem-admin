describe('Section J: Substitute Requests Log', () => {
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
    cy.visit('/sub-requests')
    cy.title().should('contain', 'Sub Requests Log')
    cy.wait(1000) // Wait for page to load
  })

  it('Test Case 19: Filter, Search, and Audit Sub Requests', () => {
    // Verify columns
    cy.get('th').contains('Class').should('be.visible')
    cy.get('th').contains('Original Instructor Email').should('be.visible')
    cy.get('th').contains('Date Of Class').should('be.visible')
    cy.get('th').contains('Request Status').should('be.visible')
    cy.get('th').contains('Substitute Instructor').should('be.visible')
    cy.get('th').contains('Substitute Instructor Email').should('be.visible')

    // Search query
    cy.get('input[placeholder="Search"]').clear().type('Python{enter}')
    cy.get('table').should(($table) => {
      // Verify Scratch gets filtered out and Python stays
      expect($table).to.not.contain('Scratch')
      expect($table).to.contain('Python')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.wait(500)

    // Filter by course
    cy.selectOption('input[name="course"]', 'Python I')
    cy.get('table').should(($table) => {
      // Verify Python II gets filtered out and Python I stays
      expect($table).to.not.contain('Python II')
      expect($table).to.contain('Python I')
    })

    // Verify Download button links to a CSV Blob
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')

    // Verify row statuses match background colors
    // Check one red row (open / needs substitute) or green row (no substitute needed) or blue row (substitute found)
    cy.get('table')
      .find('tbody')
      .find('tr')
      .each(($tr) => {
        if ($tr.text().includes('no substitute needed')) {
          cy.wrap($tr).should('have.class', 'bg-green-100')
        } else if ($tr.text().includes('open')) {
          cy.wrap($tr).should('have.class', 'bg-red-100')
        } else if ($tr.text().includes('substitute found')) {
          cy.wrap($tr).should('have.class', 'bg-blue-100')
        } else if ($tr.text().includes('substitute feedback needed')) {
          cy.wrap($tr).should('have.class', 'bg-yellow-100')
        }
      })

    // Click on a row containing notes
    cy.contains('tr', 'instructor-fake-26@gbstem.org').click()
    cy.contains('tr', 'instructor-fake-26@gbstem.org')
      .invoke('text')
      .then((text) => {
        cy.log(text)
      })
    cy.get('[role="dialog"]').should('exist')

    // Click Close inside the dialog using regex exact match
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')
  })
})
