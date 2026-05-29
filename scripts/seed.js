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

async function seed() {
  // Create/Update Admin User
  const email = 'demo@gbstem.org'
  const password = 'penguin'
  const displayName = 'Demo Admin'
  const role = 'admin'

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
      user = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: true,
      })
    } else {
      throw err
    }
  }

  console.log(
    `Setting custom user claims: { role: '${role}' } for UID: ${user.uid}...`,
  )
  await auth.setCustomUserClaims(user.uid, { role: role })
  console.log('Custom user claims successfully set.')

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
      instructorEmail: 'instructor1@gbstem.org',
      otherInstructorEmails: '',
      instructorFirstName: 'Alice',
      instructorLastName: 'Smith',
      meetingLink: 'https:// zoom.us/j/123456789',
      meetingTimes: [
        admin.firestore.Timestamp.fromDate(new Date('2026-03-02T16:00:00Z')),
        admin.firestore.Timestamp.fromDate(new Date('2026-03-04T16:00:00Z')),
      ],
      completedClassDates: [],
      classStatuses: ['scheduled', 'scheduled'],
      feedbackCompleted: [false, false],
      online: true,
      students: ['student1', 'student2'],
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

  // Create Mock Sub-Requests
  console.log(`Seeding mock sub-requests in "${subRequestsCollection}"...`)
  await db
    .collection(subRequestsCollection)
    .doc('sub-req-1')
    .set({
      classNumber: 3,
      course: 'Python I',
      dateOfClass: admin.firestore.Timestamp.fromDate(
        new Date('2026-03-09T16:00:00Z'),
      ),
      originalInstructorEmail: 'instructor1@gbstem.org',
      subInstructorId: '',
      subInstructorFirstName: '',
      subInstructorEmail: '',
      subRequestStatus: 'open',
      link: 'https:// zoom.us/j/123456789',
      notes: 'Dentist appointment.',
    })

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
    meetingLink: 'https:// zoom.us/j/555555555',
  })

  // Create Announcements
  console.log('Seeding mock announcements...')
  await db.collection('announcements').add({
    title: 'Welcome to gbSTEM Spring 2026!',
    content:
      'Our semester begins soon. Make sure to verify your schedules and log in to local emulators.',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  })

  // Create Mock Student Feedback
  console.log(
    `Seeding mock student feedback in "${classFeedbackCollection}"...`,
  )
  await db.collection(classFeedbackCollection).doc('feed-student-1').set({
    instructor: 'Alice Smith',
    date: '2026-03-10',
    feedback:
      'The class was very fun and I learned how to draw shapes in Python!',
    studentName: 'Charlie Brown',
    course: 'Python I',
    rating: 5,
  })

  // Create Mock Instructor Feedback
  console.log(
    `Seeding mock instructor feedback in "${instructorFeedbackCollection}"...`,
  )
  await db
    .collection(instructorFeedbackCollection)
    .doc('feed-instructor-1')
    .set({
      instructorName: 'Alice Smith',
      courseName: 'Python I',
      students: ['Charlie Brown', 'Sally Brown'],
      feedback:
        'Both students participated actively today. Charlie completed the exercises ahead of time.',
      date: '2026-03-10',
      attendanceList: [{ present: true }, { present: true }],
      classNumber: 1,
    })

  console.log('\nSeeding completed successfully!')
  console.log('--------------------------------------------------')
  console.log(`Login Email:    ${email}`)
  console.log(`Login Password: ${password}`)
  console.log(`Sign-up Token:  demo-token`)
  console.log(`Role:           ${role}`)
  console.log('--------------------------------------------------')
}

seed().catch((err) => {
  console.error('Error seeding Firebase emulator database:', err)
  process.exit(1)
})
