describe('Section L: Profile and Account Customization', () => {
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
    cy.visit('/profile')
    cy.title().should('contain', 'Profile')
    cy.wait(1000) // Wait for profile page to load
  })

  it('Test Case 21: Name, Email, and Password Mutations', () => {
    // 1. Stub clipboard and verify UID copy
    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })
    cy.get('button[aria-label="Copy user ID to clipboard"]').click()
    cy.get('@clipboardCopy').should('have.been.called')

    // 2. Change name
    const newName = 'Demo Admin Test'
    cy.get('input[name="full-name"]').clear().type(newName)
    cy.contains('span', 'Name')
      .parent()
      .find('button[type="submit"]')
      .click({ force: true })
    cy.get('.bg-green-200').should('contain', 'Name successfully updated.')
    cy.wait(500)

    // 3. Change email to temp and then change it back
    // We target the "Change email" fieldset
    cy.contains('span', 'Change email')
      .parent()
      .within(() => {
        cy.get('input[name="new-email"]').clear().type('tempadmin@gbstem.org')
        cy.contains('button', 'Update').click({ force: true })
      })

    // Reauthenticate dialog opens
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type('penguin')
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .click({ force: true })
    cy.get('.bg-gray-200').should('contain', 'A verification email was sent.')
    cy.wait(1000)

    // Change email back to demo@gbstem.org
    cy.contains('span', 'Change email')
      .parent()
      .within(() => {
        cy.get('input[name="new-email"]').clear().type('demo@gbstem.org')
        cy.contains('button', 'Update').click({ force: true })
      })
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type('penguin')
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .click({ force: true })
    cy.get('.bg-gray-200').should('contain', 'A verification email was sent.')
    cy.wait(1000)

    // 4. Change password to temp and then change it back
    cy.contains('span', 'Change password')
      .parent()
      .within(() => {
        cy.get('input[name="new-password"]').clear().type('penguin123')
        cy.get('input[name="confirm-password"]').clear().type('penguin123')
        cy.contains('button', 'Update').click({ force: true })
      })

    // Reauthenticate dialog
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type('penguin')
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .click({ force: true })
    cy.get('.bg-green-200').should(
      'contain',
      'Password was successfully changed.',
    )
    cy.wait(1000)

    // Change password back to penguin
    cy.contains('span', 'Change password')
      .parent()
      .within(() => {
        cy.get('input[name="new-password"]').clear().type('penguin')
        cy.get('input[name="confirm-password"]').clear().type('penguin')
        cy.contains('button', 'Update').click({ force: true })
      })

    // Reauthenticate dialog (now password is penguin123!)
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type('penguin123')
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .click({ force: true })
    cy.get('.bg-green-200').should(
      'contain',
      'Password was successfully changed.',
    )
  })
})
