import { generateDateHash } from '../support/utils'

describe('Section A: Authentication and Navigation', () => {
  it('Test Case 1: Unauthenticated Redirect to Sign In', () => {
    // Attempting to visit protected routes should redirect to signin
    cy.visit('/')
    cy.url().should('include', '/signin')
    cy.get('h1').should('contain', 'Sign in')

    cy.visit('/dashboard')
    cy.url().should('include', '/signin')
    cy.get('h1').should('contain', 'Sign in')

    cy.visit('/profile')
    cy.url().should('include', '/signin')
    cy.get('h1').should('contain', 'Sign in')
  })

  it('Test Case 2: Unsuccessful Sign In', () => {
    cy.visit('/signin')
    cy.get('input[type="email"]').should('be.visible')
    cy.wait(500) // Let Svelte finish page load
    cy.fillInput('input[type="email"]', 'demo@gbstem.org')
    cy.fillInput('input[type="password"]', 'wrongpassword')
    cy.get('button[type="submit"]').click()

    // Assert that we stay on signin and an alert error is visible
    cy.url().should('include', '/signin')
    cy.waitForNotification('Wrong password.', 'bg-red-200')
  })

  it('Test Case 2b: Unauthorized Role Sign In (Student & Instructor)', () => {
    // Try logging in as instructor
    cy.visit('/signin')
    cy.get('input[type="email"]').should('be.visible')
    cy.wait(500)
    cy.fillInput('input[type="email"]', 'instructor@gbstem.org')
    cy.fillInput('input[type="password"]', 'penguin')
    cy.get('button[type="submit"]').click()

    // Assert that we stay on signin and get the appropriate error message
    cy.url().should('include', '/signin')
    cy.waitForNotification(
      'Unauthorized: You do not have permission to access the admin site.',
      'bg-red-200',
    )

    // Clear session/cookies and try logging in as student
    cy.clearAllCookies()
    cy.clearAllLocalStorage()
    cy.clearAllSessionStorage()

    cy.visit('/signin')
    cy.get('input[type="email"]').should('be.visible')
    cy.wait(500)
    cy.fillInput('input[type="email"]', 'student@gbstem.org')
    cy.fillInput('input[type="password"]', 'penguin')
    cy.get('button[type="submit"]').click()

    // Assert that we stay on signin and get the appropriate error message
    cy.url().should('include', '/signin')
    cy.waitForNotification(
      'Unauthorized: You do not have permission to access the admin site.',
      'bg-red-200',
    )
  })

  it('Test Case 3: Successful Sign In', () => {
    cy.visit('/')
    cy.url().should('include', '/signin')
    cy.get('input[type="email"]').should('be.visible')
    cy.wait(500) // Wait for the double redirect and auth listener to settle
    cy.fillInput('input[type="email"]', 'demo@gbstem.org')
    cy.fillInput('input[type="password"]', 'penguin')
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/dashboard')
    cy.get('h1').should('contain', 'Dashboard')

    // Verify authorized navigation components are visible
    cy.contains('a', 'Dashboard').should('be.visible')
    cy.contains('a', 'Classes').should('be.visible')
    cy.contains('a', 'Students').should('be.visible')
    cy.get('button[aria-label="Profile menu"]').should('be.visible')
  })

  it('Test Case 4: Password Reset Form', () => {
    cy.visit('/signin')
    cy.contains('a', 'Forgot password?').click()
    cy.url().should('include', '/reset-password')
    cy.get('input[type="email"]').should('be.visible')
    cy.wait(500) // Wait for Svelte transition to settle

    cy.fillInput('input[type="email"]', 'demo@gbstem.org')
    cy.get('button[type="submit"]').click()

    // Verify reset notification toast shows up
    cy.get('body').should('contain', 'Password reset email was sent')
    cy.get('input[type="email"]').should('have.value', '')
  })

  ;[
    { resend: false, label: 'Original Email' },
    { resend: true, label: 'Resent Email' },
  ].forEach(({ resend, label }) => {
    it(`Test Case 5a: Admin Sign Up with Registration Token (${label})`, () => {
      // Navigate using the demo token seeded in scripts/seed.js
      cy.visit('/signup?token=demo-admin-token')
      cy.get('h1').should('contain', 'Sign up')
      cy.get('input[name="first-name"]').should('be.visible')
      cy.wait(500) // Wait for signup initialization

      const first = 'Charlie'
      const last = generateDateHash(`Brown-${resend ? 'resend' : 'orig'}`)
      const email = `${generateDateHash(`charlie.brown.${resend ? 'resend' : 'orig'}`)}@gmail.com`

      cy.fillInput('input[name="first-name"]', first)
      cy.fillInput('input[name="last-name"]', last)
      cy.fillInput('input[name="email"]', email)
      cy.fillInput('input[name="password"]', 'penguin')
      cy.fillInput('input[name="confirm-password"]', 'penguin')
      cy.get('button[type="submit"]').click()

      // Expect sign up to leave user signed in and redirect to profile page on success
      cy.url().should('include', '/profile')
      cy.get('h1').should('contain', 'Profile')

      // Expect a dialog to pop up asking the user to verify their email
      cy.get('[role="dialog"]').should('exist')
      cy.contains('Please verify your email').should('be.visible')
      cy.waitForNotification('Email is not verified.', 'bg-red-200')

      // Verify main navigation links are hidden until this account is verified
      cy.contains('a', 'Dashboard').should('not.exist')
      cy.contains('a', 'Classes').should('not.exist')
      cy.contains('a', 'Students').should('not.exist')
      cy.contains('a', 'Interviews').should('not.exist')
      cy.contains('a', 'Applications').should('not.exist')
      cy.contains('a', 'Registrations').should('not.exist')
      cy.contains('a', 'Sub Requests Log').should('not.exist')

      // Close verification dialog
      cy.get('[role="dialog"]')
        .find('button')
        .contains('Close')
        .click({ force: true })
      cy.get('[role="dialog"]').should('not.exist')

      if (resend) {
        // Verify original OOB link exists but don't click it
        cy.getLatestOobLink(email, 'VERIFY_EMAIL').should('exist')
        // Clear out the original verification email
        cy.clearTestEmails()
        // Click "Send it again" to get a second OOB link
        cy.contains('button', 'Send it again.').click()
        cy.waitForNotification('Verification email was sent.', 'bg-gray-200')
        // Verify using the new OOB link
        cy.getLatestOobLink(email, 'VERIFY_EMAIL').then((link) => {
          cy.request(link)
        })
      } else {
        // Verify Email (emulated email side-channel using original link)
        cy.getLatestOobLink(email, 'VERIFY_EMAIL').then((link) => {
          cy.request(link)
        })
      }

      // Return to the profile page
      cy.visit('/profile')
      cy.get('.bg-red-200').should('not.exist')
      cy.contains('Please verify your email').should('not.exist')

      // Verify main navigation links are now visible
      cy.contains('a', 'Dashboard').should('be.visible')
      cy.contains('a', 'Classes').should('be.visible')
      cy.contains('a', 'Students').should('be.visible')
      cy.contains('a', 'Interviews').should('be.visible')
      cy.contains('a', 'Applications').should('be.visible')
      cy.contains('a', 'Registrations').should('be.visible')
      cy.contains('a', 'Sub Requests Log').should('be.visible')
    })
  })

  ;[
    { resend: false, label: 'Original Email' },
    { resend: true, label: 'Resent Email' },
  ].forEach(({ resend, label }) => {
    it(`Test Case 5b: Reviewer Sign Up with Registration Token (${label})`, () => {
      // Navigate using the demo token seeded in scripts/seed.js
      cy.visit('/signup?token=demo-reviewer-token')
      cy.get('h1').should('contain', 'Sign up')
      cy.get('input[name="first-name"]').should('be.visible')
      cy.wait(500) // Wait for signup initialization

      const first = 'Charlie'
      const last = generateDateHash(`Reviewer-${resend ? 'resend' : 'orig'}`)
      const email = `${generateDateHash(`charlie.reviewer.${resend ? 'resend' : 'orig'}`)}@gmail.com`

      cy.fillInput('input[name="first-name"]', first)
      cy.fillInput('input[name="last-name"]', last)
      cy.fillInput('input[name="email"]', email)
      cy.fillInput('input[name="password"]', 'penguin')
      cy.fillInput('input[name="confirm-password"]', 'penguin')
      cy.get('button[type="submit"]').click()

      // Expect sign up to leave user signed in and redirect to profile page on success
      cy.url().should('include', '/profile')
      cy.get('h1').should('contain', 'Profile')

      // Expect a dialog to pop up asking the user to verify their email
      cy.get('[role="dialog"]').should('exist')
      cy.contains('Please verify your email').should('be.visible')
      cy.waitForNotification('Email is not verified.', 'bg-red-200')

      // Verify main navigation links are hidden because this account is not verified.
      cy.contains('a', 'Dashboard').should('not.exist')
      cy.contains('a', 'Classes').should('not.exist')
      cy.contains('a', 'Students').should('not.exist')
      cy.contains('a', 'Interviews').should('not.exist')
      cy.contains('a', 'Applications').should('not.exist')
      cy.contains('a', 'Registrations').should('not.exist')
      cy.contains('a', 'Sub Requests Log').should('not.exist')

      // Close verification dialog
      cy.get('[role="dialog"]')
        .find('button')
        .contains('Close')
        .click({ force: true })
      cy.get('[role="dialog"]').should('not.exist')

      if (resend) {
        // Verify original OOB link exists but don't click it
        cy.getLatestOobLink(email, 'VERIFY_EMAIL').should('exist')
        // Clear out the original verification email
        cy.clearTestEmails()
        // Click "Send it again" to get a second OOB link
        cy.contains('button', 'Send it again.').click()
        cy.waitForNotification('Verification email was sent.', 'bg-gray-200')
        // Verify using the new OOB link
        cy.getLatestOobLink(email, 'VERIFY_EMAIL').then((link) => {
          cy.request(link)
        })
      } else {
        // Verify Email (emulated email side-channel using original link)
        cy.getLatestOobLink(email, 'VERIFY_EMAIL').then((link) => {
          cy.request(link)
        })
      }

      // Return to the profile page
      cy.visit('/profile')
      cy.get('.bg-red-200').should('not.exist')
      cy.contains('Please verify your email').should('not.exist')

      // Verify main navigation links are now visible
      cy.contains('a', 'Dashboard').should('be.visible')
      cy.contains('a', 'Classes').should('be.visible')
      cy.contains('a', 'Students').should('be.visible')
      cy.contains('a', 'Interviews').should('be.visible')
      cy.contains('a', 'Applications').should('be.visible')
      cy.contains('a', 'Registrations').should('be.visible')
      cy.contains('a', 'Sub Requests Log').should('be.visible')
    })
  })
})
