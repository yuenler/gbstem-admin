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
    cy.signedInSession('admin', { initialPage: '/tokens' })
    cy.selectOption('input[name="per-page"]', '50')
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
    cy.get('input[name="what-role-should-this-token-grant"]')
      .parent()
      .find('button')
      .contains('admin')
      .click({ force: true })

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
    cy.waitForNotification('Changes were saved successfully.')

    cy.window().then((win) => {
      const stub = cy.stub(win.navigator.clipboard, 'writeText')
      stub.resolves()
      cy.wrap(stub).as('clipboardCopy')
    })

    // Find the newly created row (role "admin" and token ID has length 20).
    // Retry via .should() until the row renders instead of guessing how long
    // the table takes to pick up the new token.
    cy.get('tbody tr', { timeout: 10000 }).should(($rows) => {
      const found = $rows
        .toArray()
        .some((el) => Cypress.$(el).find('th').text().trim().length === 20)
      expect(
        found,
        'expected a newly created 20-character token ID row',
      ).to.equal(true)
    })
    cy.get('tbody tr').then(($rows) => {
      const foundRow = $rows
        .toArray()
        .find((el) => Cypress.$(el).find('th').text().trim().length === 20)
      cy.wrap(Cypress.$(foundRow)).as('newAdminRow')
    })

    cy.get('@newAdminRow').within(() => {
      cy.contains('button', 'Copy').click({ force: true })
    })
    cy.get('@clipboardCopy').then((stub: any) => {
      expect(stub.callCount).to.equal(1)
      const url = stub.firstCall.args[0]
      expect(url).to.match(/\/signup\?token=[a-zA-Z0-9]{20}$/)
    })
    cy.waitForNotification('Token copied.')

    // Click Delete on the admin token row
    cy.get('@newAdminRow')
      .find('th')
      .invoke('text')
      .then((text) => {
        const tokenId = text.trim()
        cy.get('@newAdminRow').within(() => {
          cy.contains('button', 'Delete').click({ force: true })
        })
        cy.waitForNotification('Token deleted.')
        cy.get('tbody').should('not.contain', tokenId)
      })
  })
})
