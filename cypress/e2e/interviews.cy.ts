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
    cy.signedInSession('admin', { initialPage: '/interviews' })
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
        cy.get('input[name^="assign-interviewee"]')
          .parent()
          .find('button')
          .contains('David Miller')
          .click({ force: true })
      })

    // Confirm Timeslot with an assigned interviewe
    cy.on('window:confirm', () => true)
    cy.contains('button', 'Confirm Timeslot').click({ force: true })
    cy.waitForNotification('Interviewee assigned and email sent.')
    cy.verifyEmailSent('applicant1@gmail.com', 'your interview with')

    // Verify slot is created and appears in list. Scope by the meeting link
    // we just typed rather than "David Miller" -- scripts/seed.ts also seeds
    // a "slot-1" interview owned by Demo Admin with David Miller as the
    // interviewee, and Firestore's unscoped query doesn't guarantee result
    // order, so matching on the name alone can land on the wrong card.
    cy.contains('a', 'https://zoom.us/j/9999999999').should('exist')

    // Find the newly created slot card and click Edit
    cy.contains('a', 'https://zoom.us/j/9999999999')
      .parent()
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

    // Verify updated details
    cy.contains('a', 'https://zoom.us/j/8888888888').should('exist')

    // Click Edit again on the same card, scoped by its (now updated) unique
    // meeting link for the same reason as above.
    cy.contains('a', 'https://zoom.us/j/8888888888')
      .parent()
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

    // Verify it is removed from list
    cy.contains('a', 'https://zoom.us/j/8888888888').should('not.exist')
  })
})
