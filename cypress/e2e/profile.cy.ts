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
    cy.signedInSession('admin', { initialPage: '/profile' })
  })

  it('Test Case 21: Name, Email, and Password Mutations', () => {
    // 1. Stub clipboard and verify UID copy
    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })

    cy.contains('div', /^UID:/)
      .invoke('text')
      .then((uidText) => {
        const expectedUid = uidText.replace('UID:', '').trim()
        cy.get('button[aria-label="Copy user ID to clipboard"]').click()
        cy.get('@clipboardCopy').then((stub: any) => {
          expect(stub.calledOnce).to.equal(true)
          expect(stub.firstCall.args[0]).to.equal(expectedUid)
        })
      })

    // 2. Change name
    const newName = 'Demo Admin Test'
    cy.get('input[name="full-name"]').should('have.value', 'Demo Admin')
    cy.get('input[name="full-name"]').clear().type(newName)
    cy.get('input[name="full-name"]')
      .closest('.items-end')
      .contains('button', 'Update')
      .click({ force: true })
    cy.waitForNotification('Name successfully updated.')
    cy.get('input[name="full-name"]').should('have.value', newName)
    cy.wait(500)

    // 3. Change email to temp and then change it back
    // We target the "Change email" fieldset
    cy.contains('span', 'Change email')
      .parent()
      .within(() => {
        cy.get('input[name="new-email"]').clear().type('tempadmin@gbstem.org')
        cy.get('input[name="new-email"]')
          .closest('.items-end')
          .contains('button', 'Update')
          .click({ force: true })
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
    cy.waitForNotification('A verification email was sent.', 'bg-gray-200')
    cy.wait(1000)

    // Change email back to demo@gbstem.org
    cy.contains('span', 'Change email')
      .parent()
      .within(() => {
        cy.get('input[name="new-email"]').clear().type('demo@gbstem.org')
        cy.get('input[name="new-email"]')
          .closest('.items-end')
          .contains('button', 'Update')
          .click({ force: true })
      })
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type('penguin')
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .click({ force: true })
    cy.waitForNotification('A verification email was sent.', 'bg-gray-200')
    cy.wait(1000)

    // 4. Change password to temp and then change it back
    cy.contains('span', 'Change password')
      .parent()
      .within(() => {
        cy.get('input[name="new-password"]').clear().type('penguin123')
        cy.get('input[name="confirm-password"]').clear().type('penguin123')
        cy.get('input[name="confirm-password"]')
          .closest('.items-end')
          .contains('button', 'Update')
          .click({ force: true })
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
    cy.waitForNotification('Password was successfully changed.')
    cy.contains('span', 'Change password')
      .parent()
      .within(() => {
        cy.get('input[name="new-password"]').should('have.value', '')
        cy.get('input[name="confirm-password"]').should('have.value', '')
      })
    cy.wait(1000)

    // Change password to penguin!, which allows us to test that the previous
    // password change worked during the reauthenticate step.
    cy.contains('span', 'Change password')
      .parent()
      .within(() => {
        cy.get('input[name="new-password"]').clear().type('penguin!')
        cy.get('input[name="confirm-password"]').clear().type('penguin!')
        cy.get('input[name="confirm-password"]')
          .closest('.items-end')
          .contains('button', 'Update')
          .click({ force: true })
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
    cy.waitForNotification('Password was successfully changed.')
    cy.contains('span', 'Change password')
      .parent()
      .within(() => {
        cy.get('input[name="new-password"]').should('have.value', '')
        cy.get('input[name="confirm-password"]').should('have.value', '')
      })
  })
})
