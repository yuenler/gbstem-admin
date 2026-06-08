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

    // Verify preconditions
    cy.get('table').should(($table) => {
      expect($table).to.contain('Scratch')
      expect($table).to.contain('Python')
    })

    // Search query
    cy.get('input[placeholder="Search"]').clear().type('Python{enter}')
    cy.get('table').should(($table) => {
      // Verify Scratch gets filtered out and Python stays
      expect($table).to.not.contain('Scratch')
      expect($table).to.contain('Python')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table').should(($table) => {
      // Verify Scratch reappears
      expect($table).to.contain('Scratch')
      expect($table).to.contain('Python')
    })

    // Filter by course
    cy.selectOption('input[name="course"]', 'Python 1')
    cy.get('table').should(($table) => {
      // Verify Python 2 gets filtered out and Python 1 stays
      expect($table).to.not.contain('Python 2')
      expect($table).to.contain('Python 1')
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
        const lines = text
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean)
        const headers = lines[0].split(',').map((h: string) => h.trim())
        expect(headers).to.deep.equal([
          'id',
          'course',
          'classNumber',
          'originalInstructorEmail',
          'dateOfClass',
          'subRequestStatus',
          'subInstructorFirstName',
          'subInstructorEmail',
          'notes',
        ])
        const first5Rows = lines
          .slice(1, 6)
          .map((line: string) => line.split(','))
        expect(first5Rows.length).to.be.at.most(5)

        const expectedRowsWithoutDates = [
          [
            'sub-req-fake-29',
            'Python 1',
            '2',
            'instructor-fake-29@gbstem.org',
            'completed',
            'Mary',
            'sub-29@gbstem.org',
            'Dentist appointment fake #29.',
          ],
          [
            'sub-req-fake-25',
            'Python 1',
            '2',
            'instructor-fake-25@gbstem.org',
            'accepted',
            'Margaret',
            'sub-25@gbstem.org',
            'Dentist appointment fake #25.',
          ],
          [
            'sub-req-fake-21',
            'Python 1',
            '2',
            'instructor-fake-21@gbstem.org',
            'open',
            '',
            '',
            'Dentist appointment fake #21.',
          ],
          [
            'sub-req-fake-17',
            'Python 1',
            '2',
            'instructor-fake-17@gbstem.org',
            'completed',
            'Karen',
            'sub-17@gbstem.org',
            'Dentist appointment fake #17.',
          ],
          [
            'sub-req-fake-13',
            'Python 1',
            '2',
            'instructor-fake-13@gbstem.org',
            'accepted',
            'Jessica',
            'sub-13@gbstem.org',
            'Dentist appointment fake #13.',
          ],
        ]

        first5Rows.forEach((row: string[], idx: number) => {
          // Assert the date string matches ISO format
          expect(row[4]).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

          // Reconstruct the row without the date column (index 4)
          const rowWithoutDate = [...row.slice(0, 4), ...row.slice(5)]
          expect(rowWithoutDate).to.deep.equal(expectedRowsWithoutDates[idx])
        })
      })

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
    cy.contains('tr', 'instructor-fake-25@gbstem.org').click()
    cy.get('[role="dialog"]').should('exist')
    cy.get('[role="dialog"]').contains('div', 'Dentist appointment fake #25.')

    // Click Close inside the dialog
    cy.contains('button', 'Close').click()
    cy.get('[role="dialog"]').should('not.exist')
  })
})
