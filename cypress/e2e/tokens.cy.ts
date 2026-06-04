describe('Section K: Registration Signup Tokens', () => {
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
    cy.visit('/tokens')
    cy.title().should('contain', 'Tokens')
    cy.wait(1000) // Wait for tokens to load
  })

  it('Test Case 20: Create, Copy, and Delete Signup Tokens', () => {
    // Click the blue "+" button in the table header to open creation modal
    cy.get('th').find('button').click({ force: true })
    cy.get('[role="dialog"]').should('exist')

    // Fill out Token creation form
    // Role selection
    cy.get('input[name="what-role-should-this-token-grant"]')
      .clear()
      .type('admin')
    cy.wait(300)
    cy.get('input[name="what-role-should-this-token-grant"]').type('{enter}')
    cy.wait(200)

    // Check "Should this token be one-time use?"
    cy.get('input[name="should-this-token-be-one-time-use"]').check({
      force: true,
    })

    // Set hours to 24 natively
    cy.get('input[name="after-how-many-hours-should-this-token-expire"]').then(
      ($el) => {
        const el = $el[0] as HTMLInputElement
        el.value = '24'
        el.dispatchEvent(new Event('input', { bubbles: true }))
      },
    )

    // Click Create
    cy.contains('button', 'Create').click({ force: true })
    cy.get('.bg-green-200').should(
      'contain',
      'Changes were saved successfully.',
    )
    cy.wait(1000)

    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })

    // Find the newly created row (it should have role "admin" and consumable "Yes" or checked SVG)
    // We can look for a row with role "admin" and click Copy
    cy.contains('tr', 'admin').within(() => {
      cy.contains('button', 'Copy').click({ force: true })
    })
    cy.get('@clipboardCopy').should('have.been.called')
    cy.get('.bg-green-200').should('contain', 'Token copied.')

    // Click Delete on the admin token row
    cy.contains('tr', 'admin').within(() => {
      cy.contains('button', 'Delete').click({ force: true })
    })
    cy.get('.bg-green-200').should('contain', 'Token deleted.')
  })
})
