describe('Section H: Interview Timeslots Configuration', () => {
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
    cy.visit('/interviews')
    cy.title().should('contain', 'Interview Timeslots')
    cy.wait(1000) // Wait for page to load
  })

  it('Test Case 16: View, Create, and Manage Interview Slots', () => {
    // Verify Interview Time Requests card is visible
    cy.contains('h2', 'Interview Time Requests').should('exist')

    // Fill slot details
    // Future date: 2027-10-10 at 10:00 AM
    cy.contains('h2', 'Add A Time Slot')
      .parent()
      .within(() => {
        cy.get('input[type="datetime-local"]').clear().type('2027-10-10T10:00')
        cy.get('input[name="interview-meeting-link"]')
          .clear()
          .type('https://zoom.us/j/9999999999')

        // Assign Interviewee: select David Miller
        cy.get('input[name^="assign-interviewee"]').clear().type('David Miller')
        cy.wait(300)
        cy.get('input[name^="assign-interviewee"]').type('{enter}')
      })
    cy.wait(200)

    // Confirm Timeslot with an assigned interviewe
    cy.on('window:confirm', () => true)
    cy.contains('button', 'Confirm Timeslot').click({ force: true })
    cy.waitForNotification('Interviewee assigned and email sent.')
    cy.wait(500)

    // Verify slot is created and appears in list
    cy.contains('div', 'David Miller').should('exist')

    // Find the newly created slot card and click Edit
    cy.contains('David Miller')
      .parent()
      .within(() => {
        cy.contains('button', 'Edit').click({ force: true })
      })

    // Edit meeting link and save inside the edit card
    cy.contains('Edit Interview Meeting Link')
      .parent()
      .parent()
      .within(() => {
        cy.get('input[name="edit-interview-meeting-link"]')
          .clear()
          .type('https://zoom.us/j/8888888888')
        cy.contains('button', 'Save').click({ force: true })
      })
    cy.waitForNotification('Timeslot updated successfully.')
    cy.wait(500)

    // Verify updated details
    cy.contains('a', 'https://zoom.us/j/8888888888').should('exist')

    // Click Edit again on the card for David Miller
    cy.contains('David Miller')
      .parent()
      .within(() => {
        cy.contains('button', 'Edit').click({ force: true })
      })

    // Click Delete inside the edit card
    cy.contains('Edit Interview Meeting Link')
      .parent()
      .parent()
      .within(() => {
        cy.contains('button', 'Delete').click({ force: true })
      })
    cy.waitForNotification('Timeslot successfully deleted.')
    cy.wait(500)

    // Verify it is removed from list
    cy.contains('a', 'https://zoom.us/j/8888888888').should('not.exist')
  })
})
