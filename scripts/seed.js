import admin from 'firebase-admin'

// Configure environment variables to point to the local Firebase emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.GCLOUD_PROJECT = 'demo-gbstem'

console.log('Connecting to Firebase emulators at:')
console.log(`- Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`)
console.log(`- Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`)
console.log(`- Project ID: ${process.env.GCLOUD_PROJECT}\n`)

// Initialize Firebase Admin SDK
admin.initializeApp({
  projectId: 'demo-gbstem',
})

const auth = admin.auth()
const db = admin.firestore()

// Define collection names matching collections.ts
const classesCollection = 'classesSpring26'
const registrationsCollection = 'registrationsSpring26'
const decisionsCollection = 'decisionsSpring26'
const applicationsCollection = 'applicationsSpring26'
const subRequestsCollection = 'subRequests'
const interviewTimesCollection = 'instructorInterviewTimesSpring26'
const classFeedbackCollection = 'classFeedbackSpring26'
const instructorFeedbackCollection = 'instructorFeedbackSpring26'

async function createOrUpdateUser(uid, email, password, displayName, role) {
  let user
  try {
    console.log(`Checking if user ${email} already exists...`)
    user = await auth.getUserByEmail(email)
    console.log(
      `User already exists (UID: ${user.uid}). Updating password and details...`,
    )
    user = await auth.updateUser(user.uid, {
      password: password,
      displayName: displayName,
      emailVerified: true,
    })
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`User does not exist. Creating new user ${email}...`)
      const options = {
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: true,
      }
      if (uid) {
        options.uid = uid
      }
      user = await auth.createUser(options)
    } else {
      throw err
    }
  }

  console.log(
    `Setting custom user claims: { role: '${role}' } for UID: ${user.uid}...`,
  )
  await auth.setCustomUserClaims(user.uid, { role: role })
  console.log(`Custom user claims successfully set for ${email}.`)
  return user
}

async function seed() {
  // Create/Update Seed Users
  const adminUser = await createOrUpdateUser(
    null,
    'demo@gbstem.org',
    'penguin',
    'Demo Admin',
    'admin',
  )
  await createOrUpdateUser(
    'instructor-demo-uid',
    'instructor@gbstem.org',
    'penguin',
    'Demo Instructor',
    'instructor',
  )
  await createOrUpdateUser(
    'student-demo-uid',
    'student@gbstem.org',
    'penguin',
    'Demo Student',
    'student',
  )

  console.log('Seeding mock profiles in "users" and "ids" collections...')
  await db.collection('ids').doc('1111111').set({})
  await db.collection('users').doc('instructor-demo-uid').set({
    id: '1111111',
    role: 'instructor',
    firstName: 'Demo',
    lastName: 'Instructor',
  })

  await db.collection('ids').doc('2222222').set({})
  await db.collection('users').doc('student-demo-uid').set({
    id: '2222222',
    role: 'student',
    firstName: 'Demo',
    lastName: 'Student',
  })

  await db.collection('ids').doc('3333333').set({})
  await db.collection('users').doc(adminUser.uid).set({
    id: '3333333',
    role: 'admin',
    firstName: 'Demo',
    lastName: 'Admin',
  })

  // Create Signup Token
  console.log('Creating a demo signup token in "tokens" collection...')
  await db
    .collection('tokens')
    .doc('demo-token')
    .set({
      consumable: false,
      consumers: [],
      expires: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      ),
      role: 'admin',
    })

  // Create Semester Dates Document
  console.log('Creating semesterDates/spring26 document...')
  await db.collection('semesterDates').doc('spring26').set({
    classesStart: '2026-03-01T09:00:00Z',
    classesEnd: '2026-06-30T17:00:00Z',
    instructorOrientation: '2026-02-20T09:00:00Z',
    studentOrientation: '2026-02-25T09:00:00Z',
    newInstructorAppsDue: '2026-02-15T23:59:59Z',
    registrationsDue: '2026-02-15T23:59:59Z',
    leadershipAppsDue: '2026-02-15T23:59:59Z',
    returningInstructorAppsDue: '2026-02-15T23:59:59Z',
    newInstructorAppsOpen: '2026-01-01T09:00:00Z',
    returningInstructorAppsOpen: '2026-01-01T09:00:00Z',
    parentOrientation: '2026-02-22T09:00:00Z',
    registrationsOpen: '2026-01-01T09:00:00Z',
  })

  // Create Mock Classes
  console.log(`Seeding mock classes in "${classesCollection}"...`)
  await db
    .collection(classesCollection)
    .doc('class-python1')
    .set({
      classCap: 15,
      classDay1: 'Monday',
      classDay2: 'Wednesday',
      classTime1: '16:00',
      classTime2: '16:00',
      course: 'Python I',
      instructorEmail: 'instructor@gbstem.org',
      otherInstructorEmails: '',
      instructorFirstName: 'Demo',
      instructorLastName: 'Instructor',
      meetingLink: 'https://zoom.us/j/123456789',
      meetingTimes: [
        admin.firestore.Timestamp.fromDate(new Date('2026-03-02T16:00:00Z')),
        admin.firestore.Timestamp.fromDate(new Date('2026-03-04T16:00:00Z')),
      ],
      completedClassDates: [],
      classStatuses: ['scheduled', 'scheduled'],
      feedbackCompleted: [false, false],
      online: true,
      students: ['student-demo-uid-1', 'student1', 'student2'],
    })

  await db
    .collection(classesCollection)
    .doc('class-scratch')
    .set({
      classCap: 12,
      classDay1: 'Tuesday',
      classDay2: 'Thursday',
      classTime1: '17:00',
      classTime2: '17:00',
      course: 'Scratch',
      instructorEmail: 'instructor2@gbstem.org',
      otherInstructorEmails: 'assistant@gbstem.org',
      instructorFirstName: 'Bob',
      instructorLastName: 'Jones',
      meetingLink: 'https:// zoom.us/j/987654321',
      meetingTimes: [
        admin.firestore.Timestamp.fromDate(new Date('2026-03-03T17:00:00Z')),
        admin.firestore.Timestamp.fromDate(new Date('2026-03-05T17:00:00Z')),
      ],
      completedClassDates: [],
      classStatuses: ['scheduled', 'scheduled'],
      feedbackCompleted: [false, false],
      online: true,
      students: ['student3'],
    })

  // Create Mock Registrations
  console.log(`Seeding mock registrations in "${registrationsCollection}"...`)
  await db
    .collection(registrationsCollection)
    .doc('reg-charlie')
    .set({
      personal: {
        email: 'parent1@gmail.com',
        studentFirstName: 'Charlie',
        studentLastName: 'Brown',
        parentFirstName: 'Lucy',
        parentLastName: 'Brown',
        secondaryEmail: 'parent1_sec@gmail.com',
        dateOfBirth: '2016-05-15',
        gender: 'Male',
        race: ['White'],
        phoneNumber: '555-0199',
        frlp: 'No',
        parentEducation: "Bachelor's Degree",
      },
      academic: {
        school: 'Pinecrest Elementary',
        grade: '4',
      },
      program: {
        csCourse: 'Scratch',
        mathCourse: 'Math I',
        engineeringCourse: 'Engineering I',
        scienceCourse: 'Environmental Science',
        reason: 'Loves computers and building things.',
        inPerson: false,
      },
      inPerson: {
        allergies: 'None',
        parentPickup: 'Lucy Brown',
      },
      agreements: {
        entireProgram: true,
        timeCommitment: true,
        submitting: true,
        mediaRelease: true,
        bypassAgeLimits: false,
      },
      meta: {
        id: 'reg-charlie',
        uid: 'user1',
        submitted: true,
      },
      timestamps: {
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp(),
      },
    })

  await db
    .collection(registrationsCollection)
    .doc('reg-sally')
    .set({
      personal: {
        email: 'parent2@gmail.com',
        studentFirstName: 'Sally',
        studentLastName: 'Brown',
        parentFirstName: 'Lucy',
        parentLastName: 'Brown',
        secondaryEmail: 'parent2_sec@gmail.com',
        dateOfBirth: '2018-07-20',
        gender: 'Female',
        race: ['White'],
        phoneNumber: '555-0199',
        frlp: 'No',
        parentEducation: "Bachelor's Degree",
      },
      academic: {
        school: 'Pinecrest Elementary',
        grade: '2',
      },
      program: {
        csCourse: 'Python I',
        mathCourse: 'Math I',
        engineeringCourse: 'Engineering I',
        scienceCourse: 'Environmental Science',
        reason: 'Excited to learn programming.',
        inPerson: false,
      },
      inPerson: {
        allergies: 'None',
        parentPickup: 'Lucy Brown',
      },
      agreements: {
        entireProgram: true,
        timeCommitment: true,
        submitting: true,
        mediaRelease: true,
        bypassAgeLimits: false,
      },
      meta: {
        id: 'reg-sally',
        uid: 'user2',
        submitted: true,
      },
      enrolled: true,
      timestamps: {
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp(),
      },
    })

  console.log(`Seeding mock registration for student-demo-uid...`)
  await db
    .collection(registrationsCollection)
    .doc('student-demo-uid-1')
    .set({
      personal: {
        email: 'student@gbstem.org',
        studentFirstName: 'Demo Student',
        studentLastName: 'One',
        parentFirstName: 'Parent',
        parentLastName: 'Demo',
        secondaryEmail: '',
        dateOfBirth: '2016-01-01',
        gender: 'Female',
        race: ['Asian'],
        phoneNumber: '555-1111',
        frlp: 'No',
        parentEducation: "Bachelor's Degree",
      },
      academic: {
        school: 'Pinecrest Elementary',
        grade: '3',
      },
      program: {
        csCourse: 'Python I',
        mathCourse: '',
        engineeringCourse: '',
        scienceCourse: '',
        reason: 'Excited to learn python.',
        inPerson: false,
      },
      inPerson: {
        allergies: 'None',
        parentPickup: 'Parent Demo',
      },
      agreements: {
        entireProgram: true,
        timeCommitment: true,
        submitting: true,
        mediaRelease: true,
        bypassAgeLimits: false,
      },
      meta: {
        id: 'student-demo-uid-1',
        uid: 'student-demo-uid',
        submitted: true,
      },
      enrolled: true,
      classes: ['class-python1'],
      timestamps: {
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp(),
      },
    })

  // Seeding 30 additional mock students/registrations
  console.log('Seeding 30 additional mock students/registrations...')
  const firstNames = [
    'James',
    'Mary',
    'John',
    'Patricia',
    'Robert',
    'Jennifer',
    'Michael',
    'Linda',
    'William',
    'Elizabeth',
    'David',
    'Barbara',
    'Richard',
    'Susan',
    'Joseph',
    'Jessica',
    'Thomas',
    'Sarah',
    'Charles',
    'Karen',
    'Christopher',
    'Nancy',
    'Daniel',
    'Lisa',
    'Matthew',
    'Betty',
    'Anthony',
    'Margaret',
    'Mark',
    'Sandra',
  ]
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Perez',
    'Thompson',
    'White',
    'Harris',
    'Sanchez',
    'Clark',
    'Ramirez',
    'Lewis',
    'Robinson',
  ]
  const schools = [
    'Pinecrest Elementary',
    'Oakridge Elementary',
    'Brookside School',
    'Maple Valley Academy',
    'Riverdale Charter',
  ]
  const grades = ['1', '2', '3', '4', '5', '6']
  const courses = [
    'Scratch',
    'Python I',
    'Python II',
    'Java',
    'Web Development',
  ]

  for (let i = 0; i < 30; i++) {
    const id = `reg-fake-${i}`
    const studentFirstName = firstNames[i % firstNames.length]
    const studentLastName = lastNames[i % lastNames.length]
    const email = `student-${i}@gmail.com`
    const isEnrolled = i % 2 === 0 // 15 enrolled, 15 only submitted
    const inPerson = i % 5 === 0 // 6 inPerson = true
    const submitted = i % 7 !== 0 // 26 submitted = true, 4 incomplete/submitted = false

    // Vary the timestamp slightly so ordering/pagination is predictable
    const createdDate = new Date(Date.now() - (30 - i) * 60 * 60 * 1000)

    const regData = {
      personal: {
        email: email,
        studentFirstName: studentFirstName,
        studentLastName: studentLastName,
        parentFirstName: 'Parent',
        parentLastName: studentLastName,
        secondaryEmail: '',
        dateOfBirth: '2016-01-01',
        gender: i % 2 === 0 ? 'Male' : 'Female',
        race: ['White'],
        phoneNumber: `555-${String(i).padStart(4, '0')}`,
        frlp: i % 3 === 0 ? 'Yes' : 'No',
        parentEducation: "Bachelor's Degree",
      },
      academic: {
        school: schools[i % schools.length],
        grade: grades[i % grades.length],
      },
      program: {
        csCourse: courses[i % courses.length],
        mathCourse: 'Mathematics 1a',
        engineeringCourse: 'Engineering I',
        scienceCourse: 'Environmental Science',
        reason: 'Interest in STEM fields.',
        inPerson: inPerson,
      },
      inPerson: {
        allergies: 'None',
        parentPickup: 'Parent Name',
      },
      agreements: {
        entireProgram: true,
        timeCommitment: true,
        submitting: true,
        mediaRelease: true,
        bypassAgeLimits: false,
      },
      meta: {
        id: id,
        uid: `user-fake-${i}`,
        submitted: submitted,
      },
      timestamps: {
        created: admin.firestore.Timestamp.fromDate(createdDate),
        updated: admin.firestore.Timestamp.fromDate(createdDate),
      },
    }

    if (isEnrolled && submitted) {
      regData.enrolled = true
    } else {
      regData.enrolled = false
    }

    await db.collection(registrationsCollection).doc(id).set(regData)
  }

  // Create Mock Applications
  console.log(`Seeding mock applications in "${applicationsCollection}"...`)
  await db
    .collection(applicationsCollection)
    .doc('app-david')
    .set({
      personal: {
        email: 'applicant1@gmail.com',
        firstName: 'David',
        lastName: 'Miller',
        dateOfBirth: '2008-11-22',
        gender: 'Male',
        race: ['Asian'],
        phoneNumber: '555-0244',
      },
      academic: {
        school: 'Central High School',
        graduationYear: '2027',
      },
      program: {
        courses: ['Python I', 'Scratch'],
        preferences: 'Prefers Python teaching.',
        numClasses: '2',
        timeSlots: 'Monday/Wednesday',
        notAvailable: 'Friday',
        inPerson: false,
        reason: 'Wants to share coding passion with younger kids.',
      },
      essay: {
        taughtBefore: true,
        academicBackground: 'Taken AP Computer Science.',
        teachingScenario: 'Would use interactive examples and visual puzzles.',
        why: 'Believes STEM education is crucial.',
      },
      agreements: {
        entireProgram: true,
        timeCommitment: true,
        submitting: true,
      },
      meta: {
        id: 'app-david',
        uid: 'user_app1',
        interview: true,
        submitted: true,
        decision: null,
      },
      timestamps: {
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp(),
      },
    })

  console.log(`Seeding mock application for instructor-demo-uid...`)
  await db
    .collection(applicationsCollection)
    .doc('instructor-demo-uid')
    .set({
      personal: {
        email: 'instructor@gbstem.org',
        firstName: 'Demo',
        lastName: 'Instructor',
        dateOfBirth: '2000-01-01',
        gender: 'Non-binary',
        race: ['Other'],
        phoneNumber: '555-0000',
      },
      academic: {
        school: 'gbSTEM University',
        graduationYear: '2028',
      },
      program: {
        courses: ['Python I'],
        preferences: 'None',
        numClasses: '1',
        timeSlots: 'Monday/Wednesday',
        notAvailable: '',
        inPerson: false,
        reason: 'Love teaching',
      },
      essay: {
        taughtBefore: true,
        academicBackground: 'CS Major',
        teachingScenario: 'Coding exercises',
        why: 'To help kids',
      },
      agreements: {
        entireProgram: true,
        timeCommitment: true,
        submitting: true,
      },
      meta: {
        id: 'instructor-demo-uid',
        uid: 'instructor-demo-uid',
        interview: true,
        submitted: true,
        decision: db.collection(decisionsCollection).doc('instructor-demo-uid'),
      },
      timestamps: {
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp(),
      },
    })

  console.log(`Seeding mock decision for instructor-demo-uid...`)
  await db.collection(decisionsCollection).doc('instructor-demo-uid').set({
    type: 'accepted',
    likelyDecision: 'likely yes',
    course: 'Python I',
    time: 'Monday/Wednesday 16:00',
    notes: 'Welcome to the team!',
  })

  console.log(`Seeding instructor-to-class mapping...`)
  await db
    .collection('instructorClasses')
    .doc('instructor@gbstem.org')
    .set({
      classIds: ['class-python1'],
    })

  // Seeding 30 applications
  console.log('Seeding 30 additional mock applications...')
  for (let i = 0; i < 30; i++) {
    const id = `app-fake-${i}`
    const submitted = i % 3 !== 0 // 20 submitted, 10 incomplete
    const inPerson = i % 5 === 0 // 6 inPerson
    const isDecided = i % 6 === 0 // 5 decided

    const createdDate = new Date(Date.now() - (30 - i) * 60 * 60 * 1000)

    const appData = {
      personal: {
        email: `applicant-${i}@gmail.com`,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        dateOfBirth: '2008-01-01',
        gender: i % 2 === 0 ? 'Male' : 'Female',
        race: ['White'],
        phoneNumber: `555-${String(i).padStart(4, '0')}`,
      },
      academic: {
        school: schools[i % schools.length],
        graduationYear: '2028',
      },
      program: {
        courses: [courses[i % courses.length]],
        preferences: 'None',
        numClasses: '1',
        timeSlots: 'Monday/Wednesday',
        notAvailable: '',
        inPerson: inPerson,
        reason: 'Wants to teach.',
      },
      essay: {
        taughtBefore: i % 2 === 0,
        academicBackground: 'Taken CS classes.',
        teachingScenario: 'Scenario detail.',
        why: 'Why detail.',
      },
      agreements: {
        entireProgram: true,
        timeCommitment: true,
        submitting: true,
      },
      meta: {
        id: id,
        uid: `user-fake-app-${i}`,
        interview: true,
        submitted: submitted,
        decision: isDecided ? db.collection(decisionsCollection).doc(id) : null,
      },
      timestamps: {
        created: admin.firestore.Timestamp.fromDate(createdDate),
        updated: admin.firestore.Timestamp.fromDate(createdDate),
      },
    }

    await db.collection(applicationsCollection).doc(id).set(appData)

    if (isDecided) {
      await db
        .collection(decisionsCollection)
        .doc(id)
        .set({
          type: i % 12 === 0 ? 'accepted' : 'waitlisted',
          likelyDecision: i % 12 === 0 ? 'likely yes' : 'likely waitlist',
          course: courses[i % courses.length],
          time: 'Monday/Wednesday 16:00',
          notes: 'Feedback decision notes.',
        })
    }
  }

  // Seeding 30 classes
  console.log('Seeding 30 additional mock classes...')
  for (let i = 0; i < 30; i++) {
    const id = `class-fake-${i}`
    const course = courses[i % courses.length]

    await db
      .collection(classesCollection)
      .doc(id)
      .set({
        classCap: 15,
        classDay1: 'Monday',
        classDay2: 'Wednesday',
        classTime1: '16:00',
        classTime2: '16:00',
        course: course,
        instructorEmail: `instructor-fake-${i}@gbstem.org`,
        otherInstructorEmails: '',
        instructorFirstName: firstNames[i % firstNames.length],
        instructorLastName: lastNames[i % lastNames.length],
        meetingLink: 'https://zoom.us/j/123456789',
        meetingTimes: [
          admin.firestore.Timestamp.fromDate(new Date('2026-03-02T16:00:00Z')),
          admin.firestore.Timestamp.fromDate(new Date('2026-03-04T16:00:00Z')),
        ],
        completedClassDates: [],
        classStatuses: ['scheduled', 'scheduled'],
        feedbackCompleted: [false, false],
        online: true,
        students: [`student-fake-${i}`],
      })
  }

  // Seeding 30 tokens
  console.log('Seeding 30 additional mock tokens...')
  for (let i = 0; i < 30; i++) {
    const id = `token-fake-${i}`
    const role = i % 2 === 0 ? 'admin' : 'instructor'
    await db
      .collection('tokens')
      .doc(id)
      .set({
        consumable: i % 3 === 0,
        consumers: [],
        expires: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        ),
        role: role,
      })
  }

  // Create Mock Sub-Requests (30 records)
  console.log(`Seeding 30 mock sub-requests in "${subRequestsCollection}"...`)
  for (let i = 0; i < 30; i++) {
    const id = `sub-req-fake-${i}`
    const status = i % 3 === 0 ? 'open' : i % 3 === 1 ? 'accepted' : 'completed'
    await db
      .collection(subRequestsCollection)
      .doc(id)
      .set({
        classNumber: (i % 4) + 1,
        course: courses[i % courses.length],
        dateOfClass: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        ),
        originalInstructorEmail: `instructor-fake-${i}@gbstem.org`,
        subInstructorId: i % 3 !== 0 ? `sub-inst-id-${i}` : '',
        subInstructorFirstName:
          i % 3 !== 0 ? firstNames[(i + 2) % firstNames.length] : '',
        subInstructorEmail: i % 3 !== 0 ? `sub-${i}@gbstem.org` : '',
        subRequestStatus: status,
        link: 'https://zoom.us/j/123456789',
        notes: `Dentist appointment fake #${i}.`,
      })
  }

  // Create Mock Interview Slots
  console.log(
    `Seeding mock interview slots in "${interviewTimesCollection}"...`,
  )
  await db.collection(interviewTimesCollection).doc('slot-1').set({
    date: '2026-02-15T10:00:00Z',
    id: 'slot-1',
    interviewerName: 'Demo Admin',
    intervieweeFirstName: 'David',
    intervieweeLastName: 'Miller',
    intervieweeEmail: 'applicant1@gmail.com',
    intervieweeId: 'user_app1',
    interviewerEmail: 'demo@gbstem.org',
    interviewSlotStatus: 'available',
    meetingLink: 'https://zoom.us/j/555555555',
  })

  // Create Announcements (30 records)
  console.log('Seeding 30 mock announcements...')
  for (let i = 0; i < 30; i++) {
    await db.collection('announcements').add({
      title: `Welcome to gbSTEM Spring 2026! (Update #${i})`,
      content: `Our semester begins soon. Make sure to verify your schedules and log in. Announcement #${i}.`,
      timestamp: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      ),
    })
  }

  // Create Mock Student Feedback (30 records)
  console.log(
    `Seeding 30 mock student feedback in "${classFeedbackCollection}"...`,
  )
  for (let i = 0; i < 30; i++) {
    await db.collection(classFeedbackCollection).add({
      instructor: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      date: `2026-03-${10 + (i % 20)}`,
      feedback: `The class was very fun and I learned Python! (#${i})`,
      studentName: `${firstNames[(i + 1) % firstNames.length]} ${lastNames[(i + 1) % lastNames.length]}`,
      course: courses[i % courses.length],
      rating: (i % 5) + 1,
    })
  }

  // Create Mock Instructor Feedback (30 records)
  console.log(
    `Seeding 30 mock instructor feedback in "${instructorFeedbackCollection}"...`,
  )
  for (let i = 0; i < 30; i++) {
    await db.collection(instructorFeedbackCollection).add({
      instructorName: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      courseName: courses[i % courses.length],
      students: [`Student A #${i}`, `Student B #${i}`],
      feedback: `Both students participated actively today. Class #${i}.`,
      date: `2026-03-${10 + (i % 20)}`,
      attendanceList: [{ present: true }, { present: i % 3 !== 0 }],
      classNumber: (i % 4) + 1,
    })
  }

  console.log('\nSeeding completed successfully!')
  console.log('--------------------------------------------------')
  console.log('Seeded Users (Password: penguin):')
  console.log('- Admin:      demo@gbstem.org')
  console.log('- Instructor: instructor@gbstem.org')
  console.log('- Student:    student@gbstem.org')
  console.log('Sign-up Token:  demo-token')
  console.log('--------------------------------------------------')
}

seed().catch((err) => {
  console.error('Error seeding Firebase emulator database:', err)
  process.exit(1)
})
