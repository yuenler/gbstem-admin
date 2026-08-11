import { currentSemester } from '../../src/lib/data/collections'
import collectionsList from '../../src/lib/data/collectionsList.json'

// The display name (e.g. "Spring 2026") for the current semester, as shown in the
// CollectionFilter dropdown - derived from collections.ts/collectionsList.json so these
// tests don't need editing every time the semester rolls over.
const currentSemesterName =
  collectionsList.find((sem) => sem.id === currentSemester)?.name ??
  currentSemester

// Table assertions here follow a navigation that re-runs the page's server
// load. CI has no Algolia credentials, so `searchIndex` falls back to the local
// search in src/lib/server/search.ts, which reads the entire applications
// collection and then fetches each hit's decision document. This is headroom
// for that round trip, not for the search race handled by `submitSearch`.
const TABLE_TIMEOUT = 30000

// Searches go through cy.submitSearch (cypress/support/commands.ts), which
// works around a typing race that otherwise submits a truncated query.

describe('Section D: Instructor Applications Management', () => {
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
    cy.signedInSession('admin', { initialPage: '/applications' })
  })

  it('Test Case 9: Filter, Search, and Download Applications Table', () => {
    // Verify initial state
    cy.get('table', { timeout: TABLE_TIMEOUT }).should(($table) => {
      expect($table).to.contain('David Miller')
      expect($table).to.contain('Mark Lewis')
    })

    // Search for "David"
    cy.submitSearch('David')
    cy.get('table', { timeout: TABLE_TIMEOUT }).should(($table) => {
      // Ensure Mark disappears and David stays
      expect($table).to.not.contain('Mark Lewis')
      expect($table).to.contain('David Miller')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table', { timeout: TABLE_TIMEOUT }).should(($table) => {
      // Ensure Mark re-appears
      expect($table).to.contain('Mark Lewis')
      expect($table).to.contain('David Miller')
    })

    // Select "Fall 2025" from Collection dropdown
    cy.get('input[name="collection"]').clear().type('Fall 2025')
    cy.wait(200)
    cy.get('input[name="collection"]').type('{enter}')
    cy.wait(500)
    cy.get('table', { timeout: TABLE_TIMEOUT }).should(($table) => {
      // Verify no applications from the current semester remain
      expect($table).to.not.contain('David Miller')
      expect($table).to.not.contain('Mark Lewis')
    })

    // Switch back to the current semester to see the applications again
    cy.get('input[name="collection"]').clear().type(currentSemesterName)
    cy.wait(200)
    cy.get('input[name="collection"]').type('{enter}')
    cy.wait(500)
    cy.get('table', { timeout: TABLE_TIMEOUT }).should(($table) => {
      // Ensure applications from the current semester reappear
      expect($table).to.contain('David Miller')
      expect($table).to.contain('Mark Lewis')
    })

    // Select "undecided" from Decision dropdown
    cy.get('input[name="decision"]').clear().type('undecided')
    cy.wait(200)
    cy.get('input[name="decision"]').type('{enter}')
    cy.wait(500)
    cy.get('table', { timeout: TABLE_TIMEOUT }).should(($table) => {
      // Ensure demo instructor is removed and David stays
      expect($table).to.not.contain('Demo Instructor')
      expect($table).to.contain('David Miller')
    })

    // Verify Download button links to a CSV Blob
    cy.contains('a', 'Download')
      .should('have.attr', 'href')
      .and('include', 'blob:')
      .then((href) => {
        cy.window().then((win) => {
          return win.fetch(href).then((res: Response) => res.text())
        })
      })
      .then((text) => {
        cy.parseCsv(text).then((parsedRows) => {
          const headers = parsedRows[0]
          expect(headers).to.deep.equal([
            'ID',
            'Submitted',
            'Decision',
            'Likely Decision',
            'Notes',
            'First Name',
            'Last Name',
            'Email',
            'School',
            'Graduation Year',
            'Courses',
            'Time Slots',
            'Taught Before',
            'In-person',
          ])
          const first5Rows = parsedRows.slice(1, 6)
          expect(first5Rows.length).to.be.at.most(5)
          expect(first5Rows).to.deep.equal([
            [
              'app-david',
              'Submitted',
              'Undecided',
              'Undecided',
              '',
              'David',
              'Miller',
              'applicant1@gmail.com',
              'Central High School',
              '2027',
              'Python 1;Scratch 1',
              'Monday/Wednesday',
              'Yes',
              'No',
            ],
            [
              'app-fake-1',
              'Submitted',
              'Undecided',
              'Undecided',
              '',
              'Mary',
              'Johnson',
              'applicant-1@gmail.com',
              'Oakridge Elementary',
              '2028',
              'Python 1',
              'Monday/Wednesday',
              'No',
              'No',
            ],
            [
              'app-fake-10',
              'Submitted',
              'Undecided',
              'Undecided',
              '',
              'David',
              'Hernandez',
              'applicant-10@gmail.com',
              'Pinecrest Elementary',
              '2028',
              'Scratch 1',
              'Monday/Wednesday',
              'Yes',
              'Yes',
            ],
            [
              'app-fake-11',
              'Submitted',
              'Undecided',
              'Undecided',
              '',
              'Barbara',
              'Lopez',
              'applicant-11@gmail.com',
              'Oakridge Elementary',
              '2028',
              'Python 1',
              'Monday/Wednesday',
              'No',
              'No',
            ],
            [
              'app-fake-13',
              'Submitted',
              'Undecided',
              'Undecided',
              '',
              'Susan',
              'Wilson',
              'applicant-13@gmail.com',
              'Maple Valley Academy',
              '2028',
              'Web Development',
              'Monday/Wednesday',
              'No',
              'No',
            ],
          ])
        })
      })
  })

  it('Test Case 10: Bulk Application Decisions', () => {
    // Check all applications
    cy.get('#check-all').check()
    cy.get('[id^="check-"]').should('be.checked')

    // Bulk actions bar should appear in navigation bar with action buttons
    cy.contains('button', 'Interview').should('exist')
    cy.contains('button', 'Accept').should('exist')
    cy.contains('button', 'Substitute').should('exist')
    cy.contains('button', 'Waitlist').should('exist')
    cy.contains('button', 'Reject').should('exist')

    // Uncheck header checkbox
    cy.get('#check-all').uncheck()
    cy.get('[id^="check-"]').should('not.be.checked')

    // Check two rows individually
    cy.get('#check-0').check()
    cy.get('#check-1').check()

    // Actions bar should update counts
    cy.contains('button', 'Interview 2 applicants').should('exist')
    cy.contains('button', 'Accept 2 applicants').should('exist')

    // Click Close to clear selection
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[id^="check-"]').should('not.be.checked')
    cy.contains('button', 'Accept').should('not.exist')
  })

  it('Test Case 10b: Bulk Decisions Persist', () => {
    // Select a single applicant by name, scoped to their row, instead of by checkbox index,
    // so this test doesn't depend on the row ordering assumed by Test Case 10/11.
    cy.contains('tr', 'Mark Lewis').within(() => {
      cy.get('input[type="checkbox"]').check({ force: true })
    })

    cy.contains('button', 'Waitlist 1 applicant').click({ force: true })

    // A permission-denied write (the pre-fix behavior) surfaces as an error toast here
    // instead of this success toast.
    cy.waitForNotification('1 applicant waitlisted.')
    cy.verifyEmailSent('applicant-28@gmail.com', 'gbSTEM Instructor Decision')

    cy.contains('tr', 'Mark Lewis').within(() => {
      cy.get('.text-yellow-300').should('exist')
    })

    // Reload to confirm the decision was actually persisted server-side (and is readable
    // back from the correct collection), not just reflected in optimistic local state.
    cy.reload()
    cy.contains('tr', 'Mark Lewis').within(() => {
      cy.get('.text-yellow-300').should('exist')
    })

    // Test bulk decision to 'Interview' and verify interview scheduling email
    cy.wait(1000)
    cy.contains('tr', 'Mary Johnson').within(() => {
      cy.get('input[type="checkbox"]').check({ force: true })
    })

    cy.contains('button', 'Interview 1 applicant').click({ force: true })

    cy.waitForNotification('1 applicant interview.')
    cy.verifyEmailSent(
      'applicant-1@gmail.com',
      'Please schedule your gbSTEM instructor interview',
    )
  })

  // Fixture: `scripts/seedLegacy.ts` seeds a "LegacyUndecided {Semester}" applicant into each of
  // Fall25/Spring26's legacy collections (that script's hardcoded rehearsal semesters,
  // independent of the app's current semester), migrated by `migrate-semesters.ts` into
  // `semesters/{Semester}/applications`. Names are unique per semester so this test can assert
  // the Fall25 applicant does NOT show up after switching back to the current semester.
  it('Test Case 10c: Deciding On a Past-Semester Applicant Writes To That Semester', () => {
    cy.exec('yarn seed:legacy', { timeout: 120000 })
    cy.exec('yarn migrate', { timeout: 120000 })

    // Switch to a past semester via the Collection dropdown, same flow as Test Case 9.
    cy.get('input[name="collection"]').clear().type('Fall 2025')
    cy.wait(200)
    cy.get('input[name="collection"]').type('{enter}')
    cy.wait(500)

    const pastSemesterApplicantName = 'LegacyUndecided Fall25'

    cy.contains('tr', pastSemesterApplicantName).within(() => {
      cy.get('input[type="checkbox"]').check({ force: true })
    })
    cy.contains('button', 'Waitlist 1 applicant').click({ force: true })
    cy.waitForNotification('1 applicant waitlisted.')

    cy.contains('tr', pastSemesterApplicantName).within(() => {
      cy.get('.text-yellow-300').should('exist')
    })

    // Switch back to the current semester and confirm no application there was touched
    // (this is the "silent cross-semester overwrite" failure mode described above — it
    // would only reproduce if the same uid also has a current-semester application, so a
    // fully faithful fixture needs a shared uid across both semesters).
    cy.get('input[name="collection"]').clear().type(currentSemesterName)
    cy.wait(200)
    cy.get('input[name="collection"]').type('{enter}')
    cy.wait(500)
    cy.contains('tr', pastSemesterApplicantName).should('not.exist')
  })

  it('Test Case 11: Application Details Modal, Editing Details, and Decision Updates', () => {
    // Open application modal for David Miller
    cy.contains('td', 'David Miller').click()
    cy.get('[role="dialog"]').should('exist')

    // Click Close Interview Form to reveal Edit button
    cy.contains('button', 'Close Interview Form').click({ force: true })
    cy.contains('button', 'Edit').should('be.visible')
    cy.get('input[name="personal.phoneNumber"]').should('be.disabled')

    // Click Edit to enable inputs
    cy.contains('button', 'Edit').click({ force: true })
    cy.get('input[name="personal.phoneNumber"]').should('not.be.disabled')

    // Cancel changes test
    cy.get('input[name="personal.phoneNumber"]').clear().type('123-456-7890')
    cy.contains('button', 'Cancel changes').click({ force: true })
    cy.get('input[name="personal.phoneNumber"]').should('be.disabled')
    cy.get('input[name="personal.phoneNumber"]').should(
      'not.have.value',
      '123-456-7890',
    )

    // Save changes test
    cy.contains('button', 'Edit').click({ force: true })
    cy.get('input[name="personal.phoneNumber"]').clear().type('123-456-7890')
    cy.contains('button', 'Save changes').click({ force: true })

    // Verify toast success
    cy.waitForNotification('Changes were saved successfully.')
    cy.get('input[name="personal.phoneNumber"]')
      .should('be.disabled')
      .and('have.value', '123-456-7890')

    // Restore Interview Form
    cy.contains('button', 'Show Interview Form').click({ force: true })

    // Click Likely Yes
    cy.contains('button', 'Likely Yes').click({ force: true })

    // Close the details modal
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')

    // David Miller's row should now have the green check icon (text-green-300) in the Likely Decision column
    cy.contains('tr', 'David Miller').within(() => {
      cy.get('.text-green-300').should('exist')
    })

    // Re-open David Miller
    cy.contains('td', 'David Miller').click()
    cy.get('[role="dialog"]').should('exist')

    // Click Accept and confirm
    cy.on('window:confirm', () => true)
    cy.contains('button', 'Accept').click({ force: true })

    // Wait for update
    cy.wait(500)
    cy.verifyEmailSent('applicant1@gmail.com', 'gbSTEM Instructor Decision')

    // Close the modal
    cy.contains('button', /^Close$/).click({ force: true })

    // Row should show accepted decision (green check icon in Decision column)
    cy.contains('tr', 'David Miller').within(() => {
      // It should have two text-green-300 icons now (Likely Yes and Accepted Decision)
      cy.get('.text-green-300').should('have.length', 2)
    })

    // Test individual decision to 'Interview' via modal header button
    cy.contains('td', 'David Hernandez').click()
    cy.get('[role="dialog"]').should('exist')
    cy.on('window:confirm', () => true)
    cy.get('[role="dialog"]')
      .contains('button', 'Interview')
      .click({ force: true })
    cy.wait(500)
    cy.verifyEmailSent(
      'applicant-10@gmail.com',
      'Please schedule your gbSTEM instructor interview',
    )
    cy.contains('button', /^Close$/).click({ force: true })
  })

  it('Test Case 11b: Instructor Interview Guide and Evaluation Form', () => {
    // Open application modal for David Miller
    cy.contains('td', 'David Miller').click()
    cy.get('[role="dialog"]').should('exist')

    // Make sure Interview Guide is open (if it's not, click Show Interview Form)
    cy.get('body').then(($body) => {
      if ($body.text().includes('Show Interview Form')) {
        cy.contains('button', 'Show Interview Form').click({ force: true })
      }
    })

    // Fill out the evaluation guide form
    cy.contains('h2', 'Interview Guide & Evaluation Form')
      .closest('div')
      .within(() => {
        cy.get('input[type="datetime-local"]').type('2026-06-15T15:00')
        cy.get('input[name="interviewer"]').type('Jane Doe')
        cy.selectOption('input[name="attendance"]', 'On Time')

        // Ratings inputs
        cy.get('input[type="number"]').eq(0).clear().type('4') // Friendliness
        cy.get('input[type="number"]').eq(1).clear().type('4') // Explanations
        cy.get('input[type="number"]').eq(2).clear().type('3') // Engagement
        cy.get('input[type="number"]').eq(3).clear().type('4') // Pacing
        cy.get('input[type="number"]').eq(4).clear().type('4') // Overall

        // Textarea fields
        cy.get('textarea[name="conversation-notes"]').type(
          'Very polite, comfortable speaking to kids.',
        )
        cy.get(
          'textarea[name="what-courses-does-the-candidate-want-to-teach"]',
        ).type('Python 1, Scratch')
        cy.get('textarea[name="last-semester-notes"]').type(
          'Did a good job with Python 1.',
        )
        cy.get('textarea[name^="mock-lesson-notes"]').type(
          'Mock lesson was well structured. Pacing was clear.',
        )
        cy.get('textarea[name^="any-tech-or-other-issues"]').type(
          'None. Fast connection.',
        )
        cy.get('textarea[name^="availability-notes"]').type(
          'Available Saturdays and weekdays after 4pm.',
        )
        cy.get('textarea[name^="please-briefly-summarize"]').type(
          'Strong candidate, recommends for Scratch 1.',
        )

        // Save notes
        cy.contains('button', 'Save Notes').click({ force: true })
      })

    cy.waitForNotification('Notes updated successfully.')

    // Close details modal
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')

    // Re-open and verify filled values remain
    cy.contains('td', 'David Miller').click()
    cy.get('[role="dialog"]').should('exist')

    cy.get('body').then(($body) => {
      if ($body.text().includes('Show Interview Form')) {
        cy.contains('button', 'Show Interview Form').click({ force: true })
      }
    })

    // Verify fields populated
    cy.contains('h2', 'Interview Guide & Evaluation Form')
      .closest('div')
      .within(() => {
        cy.get('input[type="datetime-local"]').should(
          'have.value',
          '2026-06-15T15:00',
        )
        cy.get('input[name="interviewer"]').should('have.value', 'Jane Doe')
        cy.get('input[name="attendance"]').should('have.value', 'On Time')
        cy.get('input[type="number"]').eq(0).should('have.value', '4')
        cy.get('textarea[name="conversation-notes"]').should(
          'have.value',
          'Very polite, comfortable speaking to kids.',
        )
        cy.get(
          'textarea[name="what-courses-does-the-candidate-want-to-teach"]',
        ).should('have.value', 'Python 1, Scratch')
      })

    // Close
    cy.contains('button', /^Close$/).click({ force: true })
  })
})
