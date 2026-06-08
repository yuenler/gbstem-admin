describe('Section I: Feedback Views', () => {
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
  })

  it('Test Case 17: Audit Student Feedback', () => {
    cy.visit('/student-feedback')
    cy.url().should('include', '/student-feedback')
    cy.title().should('contain', 'Student Feedback')
    cy.wait(1000)

    // Verify columns
    cy.get('th').contains('Student Name').should('be.visible')
    cy.get('th').contains('Course').should('be.visible')
    cy.get('th').contains('Instructor Name').should('be.visible')
    cy.get('th').contains('Date').should('be.visible')
    cy.get('th').contains('Feedback').should('be.visible')
    cy.get('th').contains('Rating').should('be.visible')

    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Christopher Lee')
      expect($table).to.contain('Charles Jackson')
    })

    // Search by student name
    cy.get('input[placeholder="Search"]').clear().type('Christopher{enter}')
    cy.get('table').should(($table) => {
      // Verify Charles gets filtered out and Christopher stays
      expect($table).to.not.contain('Charles Jackson')
      expect($table).to.contain('Christopher Lee')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table').should(($table) => {
      // Verify both Charles and Christopher show up again
      expect($table).to.contain('Charles Jackson')
      expect($table).to.contain('Christopher Lee')
    })

    // Filter by course
    cy.selectOption('input[name="course"]', 'Python 1')
    cy.get('table').should(($table) => {
      // Verify Christopher gets filtered out and John stays
      expect($table).to.not.contain('Christopher Lee')
      expect($table).to.contain('John Williams')
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
          'studentName',
          'course',
          'instructorName',
          'date',
          'feedback',
          'rating',
        ])
        const first5Rows = lines
          .slice(1, 6)
          .map((line: string) => line.split(','))
        expect(first5Rows.length).to.be.at.most(5)
        first5Rows.forEach((row: string[]) => {
          expect(row[0].length).to.equal(20)
        })
        const slicedRows = first5Rows.map((row: string[]) => row.slice(1))

        expect(slicedRows[0]).to.deep.equal([
          'Charles Jackson',
          'Python 1',
          'Sarah Moore',
          '2026-03-27',
          'The class was very fun and I learned Python! (#17)',
          '3',
        ])
        expect(slicedRows[1]).to.deep.equal([
          'Joseph Anderson',
          'Python 1',
          'Susan Wilson',
          '2026-03-23',
          'The class was very fun and I learned Python! (#13)',
          '4',
        ])

        const row2and3 = [slicedRows[2], slicedRows[3]]
        expect(row2and3).to.deep.include([
          'David Hernandez',
          'Python 1',
          'Elizabeth Martinez',
          '2026-03-19',
          'The class was very fun and I learned Python! (#9)',
          '5',
        ])
        expect(row2and3).to.deep.include([
          'James Smith',
          'Python 1',
          'Sandra Robinson',
          '2026-03-19',
          'The class was very fun and I learned Python! (#29)',
          '5',
        ])

        const opt1 = [
          'Anthony Clark',
          'Python 1',
          'Betty Sanchez',
          '2026-03-15',
          'The class was very fun and I learned Python! (#25)',
          '1',
        ]
        const opt2 = [
          'Michael Miller',
          'Python 1',
          'Jennifer Garcia',
          '2026-03-15',
          'The class was very fun and I learned Python! (#5)',
          '1',
        ]
        const matchedOpt =
          Cypress._.isEqual(slicedRows[4], opt1) ||
          Cypress._.isEqual(slicedRows[4], opt2)
        expect(
          matchedOpt,
          `Row 4 should be Anthony Clark or Michael Miller. Got: ${JSON.stringify(slicedRows[4])}`,
        ).to.equal(true)
      })
  })

  it('Test Case 18: Audit Instructor Feedback and View Details', () => {
    cy.visit('/instructor-feedback')
    cy.url().should('include', '/instructor-feedback')
    cy.title().should('contain', 'Class Feedback') // The title is Class Feedback or similar
    cy.wait(1000)

    // Verify columns
    cy.get('th').contains('Instructor Name').should('be.visible')
    cy.get('th').contains('Course').should('be.visible')
    cy.get('th').contains('Class Number').should('be.visible')
    cy.get('th').contains('Date').should('be.visible')
    cy.get('th').contains('Attendance Percent').should('be.visible')
    cy.get('th').contains('Feedback').should('be.visible')

    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Karen Martin')
      expect($table).to.contain('Charles Jackson')
    })

    // Search by instructor name
    cy.get('input[placeholder="Search"]').clear().type('Karen{enter}')
    cy.get('table').should(($table) => {
      // Ensure Charles gets filtered out and Karen stays
      expect($table).to.not.contain('Charles Jackson')
      expect($table).to.contain('Karen Martin')
    })

    // Clear search using Clear button
    cy.contains('button', 'Clear').click()
    cy.get('table').should(($table) => {
      // Verify both Charles and Karen show up again
      expect($table).to.contain('Charles Jackson')
      expect($table).to.contain('Karen Martin')
    })

    // Filter by course
    cy.selectOption('input[name="course"]', 'Python 1')
    cy.get('table').should(($table) => {
      // Verify Karen gets filtered out and Mary stays
      expect($table).to.not.contain('Karen Martin')
      expect($table).to.contain('Mary Johnson')
    })

    // Click on feedback row to open modal
    cy.get('table').find('tbody').find('tr').eq(0).click()
    cy.get('[role="dialog"]').should('exist')

    // Close the details modal using exact regex matching
    cy.contains('button', /^Close$/).click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')

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
          'instructorName',
          'courseName',
          'classNumber',
          'date',
          'feedback',
        ])
        const first5Rows = lines
          .slice(1, 6)
          .map((line: string) => line.split(','))
        expect(first5Rows.length).to.be.at.most(5)
        first5Rows.forEach((row: string[]) => {
          expect(row[0].length).to.equal(20)
        })
        const slicedRows = first5Rows.map((row: string[]) => row.slice(1))

        expect(slicedRows[0]).to.deep.equal([
          'Sarah Moore',
          'Python 1',
          '2',
          '2026-03-27',
          'Both students participated actively today. Class #17.',
        ])
        expect(slicedRows[1]).to.deep.equal([
          'Susan Wilson',
          'Python 1',
          '2',
          '2026-03-23',
          'Both students participated actively today. Class #13.',
        ])

        const row2and3 = [slicedRows[2], slicedRows[3]]
        expect(row2and3).to.deep.include([
          'Elizabeth Martinez',
          'Python 1',
          '2',
          '2026-03-19',
          'Both students participated actively today. Class #9.',
        ])
        expect(row2and3).to.deep.include([
          'Sandra Robinson',
          'Python 1',
          '2',
          '2026-03-19',
          'Both students participated actively today. Class #29.',
        ])

        const opt1 = [
          'Betty Sanchez',
          'Python 1',
          '2',
          '2026-03-15',
          'Both students participated actively today. Class #25.',
        ]
        const opt2 = [
          'Jennifer Garcia',
          'Python 1',
          '2',
          '2026-03-15',
          'Both students participated actively today. Class #5.',
        ]
        const matchedOpt =
          Cypress._.isEqual(slicedRows[4], opt1) ||
          Cypress._.isEqual(slicedRows[4], opt2)
        expect(
          matchedOpt,
          `Row 4 should be Betty Sanchez or Jennifer Garcia. Got: ${JSON.stringify(slicedRows[4])}`,
        ).to.equal(true)
      })
  })
})
