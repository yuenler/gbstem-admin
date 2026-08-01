import { generateDateHash } from '../support/utils'

describe('Section N: End-to-End Account Lifecycle', () => {
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
  })

  it('Test Case 23: Complete Account Creation and Management Lifecycle', () => {
    // 1. Generate the Registration Token
    cy.signedInSession('admin', { initialPage: '/tokens' })
    cy.selectOption('input[name="per-page"]', '50')
    cy.wait(500)

    // Open creation modal
    cy.get('th').find('button').click({ force: true })
    cy.get('[role="dialog"]').should('exist')

    // Role selection: admin
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

    // Set hours to 24
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
    cy.wait(1000)

    // Setup clipboard stub to capture the token
    let signupUrl = ''
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').callsFake((text) => {
        signupUrl = text
        return Promise.resolve()
      })
    })

    // Find the new row
    cy.get('tbody tr').then(($rows) => {
      let foundRow: any = null
      $rows.each((i: number, el: any) => {
        const $row = Cypress.$(el)
        const tokenId = $row.find('th').text().trim()
        if (tokenId.length === 20) {
          foundRow = $row
        }
      })
      expect(foundRow).to.not.equal(null)
      cy.wrap(foundRow).as('newAdminRow')
    })

    // Copy token link
    cy.get('@newAdminRow').within(() => {
      cy.contains('button', 'Copy').click({ force: true })
    })
    cy.waitForNotification('Token copied.')
    cy.wait(500)

    // Sign out
    cy.signOutViaUi()

    // 2. Register the New Account
    cy.then(() => {
      expect(signupUrl).to.match(/\/signup\?token=[a-zA-Z0-9]{20}$/)
      cy.visit(signupUrl)
    })

    const initialEmail = `${generateDateHash('lifecycle.admin')}@gbstem.org`
    const initialPassword = 'initialPassword123'

    cy.get('h1').should('contain', 'Sign up')
    cy.fillInput('input[name="first-name"]', 'Lifecycle')
    cy.fillInput('input[name="last-name"]', 'Test')
    cy.fillInput('input[name="email"]', initialEmail)
    cy.fillInput('input[name="password"]', initialPassword)
    cy.fillInput('input[name="confirm-password"]', initialPassword)
    cy.get('button[type="submit"]').click()

    // Expect sign up to redirect back to signin page on success
    cy.url().should('include', '/signin')
    cy.get('h1').should('contain', 'Sign in')

    // 3. Sign In and Trigger Email Verification Guard
    cy.fillInput('input[type="email"]', initialEmail)
    cy.fillInput('input[type="password"]', initialPassword)
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/profile')
    cy.get('[role="dialog"]').should('exist')
    cy.contains('Please verify your email').should('be.visible')
    cy.waitForNotification('Email is not verified.', 'bg-red-200')

    // Verify main navigation links are hidden
    cy.contains('a', 'Dashboard').should('not.exist')
    cy.contains('a', 'Classes').should('not.exist')

    // Close verification dialog
    cy.get('[role="dialog"]')
      .find('button')
      .contains('Close')
      .click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')

    // 4. Verify Email (Emulator Side-Channel)
    cy.getLatestOobLink(initialEmail, 'VERIFY_EMAIL').then((link) => {
      cy.request(link)
    })

    // Return to the profile page
    cy.visit('/profile')
    cy.get('.bg-red-200').should('not.exist')
    cy.contains('Please verify your email').should('not.exist')

    // Verify main navigation links are now visible
    cy.contains('a', 'Dashboard').should('be.visible')
    cy.contains('a', 'Classes').should('be.visible')

    // 5. Modify Profile Information
    // Update Name. The form seeds from the canonical `users` document and
    // exposes separate first/last name fields, matching the signup form above.
    const updatedLastName = 'TestUpdated'
    cy.get('input[name="first-name"]').should('have.value', 'Lifecycle')
    cy.get('input[name="last-name"]').should('have.value', 'Test')
    cy.get('input[name="last-name"]').clear().type(updatedLastName)
    cy.get('input[name="last-name"]')
      .closest('.items-end')
      .contains('button', 'Update')
      .click({ force: true })
    cy.waitForNotification('Name successfully updated.')
    cy.get('input[name="first-name"]').should('have.value', 'Lifecycle')
    cy.get('input[name="last-name"]').should('have.value', updatedLastName)
    cy.wait(500)

    // Update Email
    const updatedEmail = `${generateDateHash('lifecycle.admin.new')}@gbstem.org`
    cy.contains('span', 'Change email')
      .parent()
      .within(() => {
        cy.get('input[name="new-email"]').clear().type(updatedEmail)
      })
    cy.get('input[name="new-email"]')
      .closest('.items-end')
      .contains('button', 'Update')
      .click({ force: true })

    // Reauthenticate dialog opens
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type(initialPassword)
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .click({ force: true })

    cy.waitForNotification('A verification email was sent.', 'bg-gray-200')
    cy.wait(500)

    // Verify the new email using emulator side-channel
    cy.getLatestOobLink(updatedEmail, 'VERIFY_AND_CHANGE_EMAIL').then(
      (link) => {
        cy.request(link)
      },
    )

    // Refresh profile and check email is updated
    cy.visit('/profile')
    cy.get('#current-email').should('have.value', updatedEmail)

    // Update Password
    const newPassword = 'newPassword789'
    cy.contains('span', 'Change password')
      .parent()
      .within(() => {
        cy.get('input[name="new-password"]').clear().type(newPassword)
        cy.get('input[name="confirm-password"]').clear().type(newPassword)
      })
    cy.get('input[name="confirm-password"]')
      .closest('.items-end')
      .contains('button', 'Update')
      .click({ force: true })

    // Reauthenticate dialog opens
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type(initialPassword)
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .click({ force: true })

    // Explicitly delete the session cookie to ensure SvelteKit treats us as signed out
    // and doesn't redirect us back to /dashboard when visiting /signin.
    cy.request('DELETE', '/api/auth')
    cy.visit('/signin')
    cy.url().should('include', '/signin')

    // 6. Password Reset
    cy.visit('/reset-password')
    cy.get('h1').should('contain', 'Reset password')
    cy.fillInput('input[type="email"]', updatedEmail)
    cy.get('button[type="submit"]').click()
    cy.get('body').should('contain', 'Password reset email was sent')

    // Find password reset link from emulator
    const finalPassword = 'finalPassword456'
    cy.getLatestOobLink(updatedEmail, 'PASSWORD_RESET').then((link) => {
      const resetLink = `${link}&newPassword=${finalPassword}`
      cy.request(resetLink)
    })

    // Sign in with new credentials
    cy.visit('/signin')
    cy.fillInput('input[type="email"]', updatedEmail)
    cy.fillInput('input[type="password"]', finalPassword)
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')

    // 7. Delete Account
    cy.visit('/profile')
    cy.wait(1000) // Allow Svelte page to hydrate and attach event handlers
    cy.contains('span', 'Delete account')
      .parent()
      .find('button[type="button"]')
      .click({ force: true })

    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]')
      .find('input[type="password"]')
      .clear()
      .type(finalPassword)
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .contains('Delete')
      .click({ force: true })

    cy.waitForNotification('Account was successfully deleted.')
    cy.wait(2500) // Wait for reload delay in DeleteAccountForm.svelte (2000ms)

    cy.url().should('include', '/signin')
  })
})
