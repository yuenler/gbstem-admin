// seedLegacy.ts - Seeds the Firebase emulator with mock data in the *old* per-semester flat
// collection layout (`{type}{Semester}`, e.g. `applicationsFall25`), across multiple
// semesters, so migrate-semesters.ts has something realistic to migrate during the § 5
// emulator rehearsal. See SEMESTER_MIGRATION_PLAN.md § 5.2.
//
// Deliberately does NOT import src/lib/data/collections.ts: those constants already point at
// the *new* semesters/{semesterId}/{name} schema (as of this migration), so legacy collection
// names are inlined/derived here instead, via the same legacyCollectionName helper
// migrate-semesters.ts itself uses.
//
// All doc IDs are `legacy-`-prefixed so migrating this data can never collide with (or
// silently overwrite) the primary current-semester fixtures scripts/seed.ts writes under the
// new schema, which Cypress specs in both repos depend on by exact name/ID.
//
// Emulator-only: unlike migrate-semesters.ts, this script has no --production mode at all -
// it exists purely to set up a rehearsal scenario and should never touch anything else.
import admin from 'firebase-admin'
import { z } from 'zod'
import {
  applicationSchema,
  classSchema,
  registrationSchema,
} from '../src/lib/components/forms/schemas'
import {
  LEGACY_COLLECTION_TYPES,
  legacyCollectionName,
} from './lib/migrationTransforms'

function validateClass(data: any, id: string) {
  try {
    classSchema.parse(data)
  } catch (err: any) {
    console.error(
      `\nValidation failed for legacy class "${id}":`,
      err.errors || err,
    )
    throw err
  }
}

function validateApplication(data: any, id: string) {
  try {
    applicationSchema.parse(data)
  } catch (err: any) {
    console.error(
      `\nValidation failed for legacy application "${id}":`,
      err.errors || err,
    )
    throw err
  }
}

function validateRegistration(data: any, id: string) {
  try {
    registrationSchema.parse(data)
  } catch (err: any) {
    console.error(
      `\nValidation failed for legacy registration "${id}":`,
      err.errors || err,
    )
    throw err
  }
}

// Configure environment variables to point to the local Firebase emulators. This script
// never supports production - unconditionally emulator-only, matching seed.ts's pattern.
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.GCLOUD_PROJECT = 'demo-gbstem'

console.log('Connecting to Firebase emulators at:')
console.log(`- Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`)
console.log(`- Project ID: ${process.env.GCLOUD_PROJECT}\n`)

admin.initializeApp({ projectId: 'demo-gbstem' })
const db = admin.firestore()

// A representative subset of collectionsList.json's semesters - enough to exercise the
// migration script's per-semester loop without needing to replicate every historical
// semester for a rehearsal.
const LEGACY_SEMESTERS = ['Fall25', 'Spring26']

async function seedSemester(semesterId: string) {
  const col = (type: (typeof LEGACY_COLLECTION_TYPES)[number]) =>
    legacyCollectionName(type, semesterId)

  console.log(`Seeding legacy-layout fixtures for ${semesterId}...`)

  // Classes
  const classId = `legacy-class-${semesterId}`
  const classData = {
    classCap: 10,
    classDay1: 'Monday',
    classDay2: 'Wednesday',
    classTime1: '16:00',
    classTime2: '16:00',
    course: 'Python 1',
    instructorEmail: `legacy-instructor-${semesterId}@gbstem.org`,
    otherInstructorEmails: '',
    instructorFirstName: 'Legacy',
    instructorLastName: semesterId,
    meetingLink: 'https://zoom.us/j/000000000',
    meetingTimes: [
      admin.firestore.Timestamp.fromDate(new Date('2025-09-01T16:00:00Z')),
      admin.firestore.Timestamp.fromDate(new Date('2025-09-03T16:00:00Z')),
    ],
    completedClassDates: [],
    classStatuses: ['ClassInFuture', 'ClassInFuture'],
    feedbackCompleted: [false, false],
    online: true,
    students: [`legacy-student-${semesterId}`],
  }
  validateClass(classData, classId)
  await db.collection(col('classes')).doc(classId).set(classData)

  // Registrations
  const registrationBase = {
    personal: {
      email: `legacy-parent-${semesterId}@gmail.com`,
      studentFirstName: 'Legacy',
      studentLastName: 'Student',
      parentFirstName: 'Legacy',
      parentLastName: 'Parent',
      secondaryEmail: '',
      dateOfBirth: '2016-01-01',
      gender: 'Female',
      race: ['White'],
      phoneNumber: '555-0100',
      frlp: 'No',
      parentEducation: "Bachelor's Degree",
    },
    academic: { school: 'Legacy Elementary', grade: '3' },
    program: {
      csCourse: 'Python 1',
      mathCourse: 'None',
      engineeringCourse: 'None',
      scienceCourse: 'None',
      reason: 'Legacy fixture for migration rehearsal.',
      inPerson: false,
    },
    inPerson: { allergies: 'None', parentPickup: 'Legacy Parent' },
    agreements: {
      entireProgram: true,
      timeCommitment: true,
      submitting: true,
      mediaRelease: true,
      bypassAgeLimits: false,
    },
    timestamps: {
      created: admin.firestore.Timestamp.fromDate(
        new Date('2025-08-01T00:00:00Z'),
      ),
      updated: admin.firestore.Timestamp.fromDate(
        new Date('2025-08-01T00:00:00Z'),
      ),
    },
  }

  const regEnrolledId = `legacy-reg-enrolled-${semesterId}`
  const regEnrolled = {
    ...registrationBase,
    meta: {
      id: regEnrolledId,
      uid: `legacy-uid-reg1-${semesterId}`,
      submitted: true,
    },
    enrolled: true,
    classes: [classId],
  }
  validateRegistration(regEnrolled, regEnrolledId)
  await db.collection(col('registrations')).doc(regEnrolledId).set(regEnrolled)

  const regUnenrolledId = `legacy-reg-unenrolled-${semesterId}`
  const regUnenrolled = {
    ...registrationBase,
    meta: {
      id: regUnenrolledId,
      uid: `legacy-uid-reg2-${semesterId}`,
      submitted: true,
    },
    enrolled: false,
  }
  validateRegistration(regUnenrolled, regUnenrolledId)
  await db
    .collection(col('registrations'))
    .doc(regUnenrolledId)
    .set(regUnenrolled)

  // Applications: one decided (with a meta.decision reference, to exercise the migration
  // script's decision-ref rewrite), one undecided.
  const applicationBase = {
    personal: {
      email: `legacy-applicant-${semesterId}@gmail.com`,
      firstName: 'Legacy',
      lastName: 'Applicant',
      dateOfBirth: '2008-01-01',
      gender: 'Male',
      race: ['Asian'],
      phoneNumber: '555-0200',
    },
    academic: { school: 'Legacy High School', graduationYear: 2027 },
    program: {
      courses: ['Python 1'],
      preferences: 'None',
      numClasses: '1',
      timeSlots: 'Monday/Wednesday',
      notAvailable: 'None',
      inPerson: false,
      reason: 'Legacy fixture for migration rehearsal.',
    },
    essay: {
      taughtBefore: false,
      academicBackground: 'N/A',
      teachingScenario: 'N/A',
      why: 'N/A',
    },
    agreements: { entireProgram: true, timeCommitment: true, submitting: true },
    timestamps: {
      created: admin.firestore.Timestamp.fromDate(
        new Date('2025-08-01T00:00:00Z'),
      ),
      updated: admin.firestore.Timestamp.fromDate(
        new Date('2025-08-01T00:00:00Z'),
      ),
    },
  }

  const appDecidedId = `legacy-app-decided-${semesterId}`
  const decisionRef = db.collection(col('decisions')).doc(appDecidedId)
  const appDecided = {
    ...applicationBase,
    meta: {
      id: appDecidedId,
      uid: `legacy-uid-app1-${semesterId}`,
      interview: true,
      submitted: true,
      decision: decisionRef,
    },
  }
  validateApplication(appDecided, appDecidedId)
  await db.collection(col('applications')).doc(appDecidedId).set(appDecided)
  await decisionRef.set({
    type: 'accepted',
    likelyDecision: 'likely yes',
    notes: 'Legacy fixture decision for migration rehearsal.',
  })

  const appUndecidedId = `legacy-app-undecided-${semesterId}`
  const appUndecided = {
    ...applicationBase,
    meta: {
      id: appUndecidedId,
      uid: `legacy-uid-app2-${semesterId}`,
      interview: false,
      submitted: true,
      decision: null,
    },
  }
  validateApplication(appUndecided, appUndecidedId)
  await db.collection(col('applications')).doc(appUndecidedId).set(appUndecided)

  // Class feedback
  await db
    .collection(col('classFeedback'))
    .doc(`legacy-classfeedback-${semesterId}`)
    .set({
      instructor: `Legacy ${semesterId}`,
      date: '2025-09-15',
      feedback: 'Legacy class feedback fixture for migration rehearsal.',
      studentName: 'Legacy Student',
      course: 'Python 1',
      rating: 5,
    })

  // Instructor feedback
  await db
    .collection(col('instructorFeedback'))
    .doc(`legacy-instructorfeedback-${semesterId}`)
    .set({
      instructorName: `Legacy ${semesterId}`,
      courseName: 'Python 1',
      students: ['Legacy Student'],
      feedback: 'Legacy instructor feedback fixture for migration rehearsal.',
      date: '2025-09-15',
      attendanceList: [{ present: true }],
      classNumber: 1,
    })

  // Interview slot
  await db
    .collection(col('instructorInterviewTimes'))
    .doc(`legacy-interview-${semesterId}`)
    .set({
      date: admin.firestore.Timestamp.fromDate(
        new Date('2025-08-15T16:00:00Z'),
      ),
      id: `legacy-interview-${semesterId}`,
      interviewerName: 'Legacy Admin',
      intervieweeFirstName: 'Legacy',
      intervieweeLastName: 'Applicant',
      intervieweeEmail: `legacy-applicant-${semesterId}@gmail.com`,
      intervieweeId: `legacy-uid-app1-${semesterId}`,
      interviewerEmail: 'demo@gbstem.org',
      interviewSlotStatus: 'available',
      meetingLink: 'https://zoom.us/j/000000001',
    })

  console.log(
    `  Done: ${LEGACY_COLLECTION_TYPES.length} collection types seeded for ${semesterId}.`,
  )
}

async function seedLegacy() {
  for (const semesterId of LEGACY_SEMESTERS) {
    await seedSemester(semesterId)
  }
  console.log(
    `\nLegacy seeding completed for: ${LEGACY_SEMESTERS.join(', ')}. ` +
      `Run "npm run migrate:dry" to preview migrating it into the new schema.`,
  )
}

seedLegacy().catch((err) => {
  console.error('Error seeding legacy-layout fixtures:', err)
  process.exit(1)
})
