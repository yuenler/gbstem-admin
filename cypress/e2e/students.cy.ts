describe('Section F: Students Directory', () => {
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
    cy.visit('/students')
    cy.title().should('contain', 'Students')
    cy.wait(1000) // Wait for students list to load
  })

  it('Test Case 14: Students Search, Filtering, and Enrolling/Dropping Classes', () => {
    // Verify initial state
    cy.get('table').should(($table) => {
      expect($table).to.contain('Charlie Brown')
      expect($table).to.contain('Sally Brown')
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
          'firstName',
          'lastName',
          'email',
          'secondaryEmail',
          'school',
          'grade',
          'csCourse',
          'engineeringCourse',
          'mathCourse',
          'scienceCourse',
          'In-person',
        ])
        const first5Rows = lines
          .slice(1, 6)
          .map((line: string) => line.split(','))
        expect(first5Rows.length).to.be.at.most(5)
        expect(first5Rows).to.deep.equal([
          [
            'student-demo-uid-1',
            'Demo Student',
            'One',
            'student@gbstem.org',
            '',
            'Pinecrest Elementary',
            '3',
            'Python 1',
            'None',
            'none',
            'None',
            'No',
          ],
          [
            'reg-sally',
            'Sally',
            'Brown',
            'parent2@gmail.com',
            'parent2_sec@gmail.com',
            'Pinecrest Elementary',
            '2',
            'Python 1',
            'Engineering 1',
            'mathematics-1-b',
            'Environmental Science B',
            'No',
          ],
          [
            'reg-charlie',
            'Charlie',
            'Brown',
            'parent1@gmail.com',
            'parent1_sec@gmail.com',
            'Pinecrest Elementary',
            '4',
            'Scratch 1',
            'Engineering 1',
            'mathematics-1-b',
            'Environmental Science B',
            'No',
          ],
          [
            'reg-fake-29',
            'Sandra',
            'Robinson',
            'student-29@gmail.com',
            '',
            'Riverdale Charter',
            '6',
            'Python 1',
            'Engineering 1',
            'mathematics-1-b',
            'Environmental Science B',
            'No',
          ],
          [
            'reg-fake-27',
            'Margaret',
            'Ramirez',
            'student-27@gmail.com',
            '',
            'Brookside School',
            '4',
            'Web Development',
            'Engineering 1',
            'mathematics-1-b',
            'Environmental Science B',
            'No',
          ],
        ])
      })

    // Search for Charlie
    cy.get('input[placeholder="Search"]').clear().type('Charlie{enter}')
    cy.get('table').should(($table) => {
      // Verify Sally gets filtered out and Charlie stays
      expect($table).to.not.contain('Sally Brown')
      expect($table).to.contain('Charlie Brown')
    })

    // Click Charlie Brown's row to open details modal
    cy.contains('td', 'Charlie Brown').click()
    cy.get('[role="dialog"]').should('exist')

    // Enroll Charlie in "Python 1"
    // eq(0) is the Add Class dropdown
    cy.get('input[name="select-a-class"]', { timeout: 15000 })
      .eq(0)
      .clear({ force: true })
      .type('Python 1', { force: true })
    cy.wait(500)
    cy.get('input[name="select-a-class"]')
      .eq(0)
      .parent()
      .parent()
      .find('button')
      .contains('Python 1')
      .click({ force: true })
    cy.wait(200)

    // Click Add Class
    cy.contains('button', 'Add Class').click({ force: true })
    cy.get('.bg-green-200', { timeout: 10000 }).should(
      'contain',
      'Enrolled in class successfully!',
    )
    cy.wait(500)

    // Class 1 Information should appear
    cy.contains('h2', 'Class 1 Information').should('exist')
    cy.contains('td', 'Python 1').should('exist')

    // Drop the class
    // eq(1) is the Drop Class dropdown
    cy.get('input[name="select-a-class"]', { timeout: 15000 })
      .eq(1)
      .clear({ force: true })
      .type('Python 1', { force: true })
    cy.wait(500)
    cy.get('input[name="select-a-class"]')
      .eq(1)
      .parent()
      .parent()
      .find('button')
      .contains('Python 1')
      .click({ force: true })
    cy.wait(200)

    // Click Drop Class
    cy.contains('button', 'Drop Class').click({ force: true })
    cy.get('.bg-green-200', { timeout: 10000 }).should(
      'contain',
      'Dropped class successfully!',
    )
    cy.wait(500)

    // Class 1 Information should no longer exist
    cy.contains('h2', 'Class 1 Information').should('not.exist')

    // Close the details modal
    cy.contains('button', 'Close').click({ force: true })
    cy.get('[role="dialog"]').should('not.exist')
  })
})
