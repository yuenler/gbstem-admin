import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  currentSemester,
  semesterCollectionPath,
} from '../../src/lib/data/collections'

/**
 * Exercises `firestore.rules` against the Firestore emulator.
 *
 * These tests exist because the role a user holds used to be readable out of
 * a document that same user could write: `hasRole()` read
 * `users/{uid}.role`, and `allow write: if isUser(userId)` let anyone set it.
 * Signing up as a student and then writing `role: 'instructor'` to your own
 * document was enough to read every student registration for the semester.
 * The rules are the only thing standing between a browser and that data, and
 * nothing else in this repo tests them, so a regression here would be silent.
 *
 * Requires the emulator: `yarn emulators`, then `yarn test:rules`.
 */

const PROJECT_ID = 'gbstem-rules-test'
const decisions = semesterCollectionPath(currentSemester, 'decisions')
const registrations = semesterCollectionPath(currentSemester, 'registrations')
const classes = semesterCollectionPath(currentSemester, 'classes')

const UIDS = {
  student: 'uid-student',
  otherStudent: 'uid-other-student',
  accepted: 'uid-accepted',
  substitute: 'uid-substitute',
  interviewing: 'uid-interviewing',
  rejected: 'uid-rejected',
  undecided: 'uid-undecided',
  admin: 'uid-admin',
  reviewer: 'uid-reviewer',
} as const

let testEnv: RulesTestEnvironment

/** A client carrying `role` as a custom claim, the way a real ID token does. */
function as(uid: string, role?: string) {
  const context = role
    ? testEnv.authenticatedContext(uid, { role })
    : testEnv.authenticatedContext(uid)
  return context.firestore()
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // The fixtures every test authorizes against. Written with rules disabled
  // because they are exactly the documents a client is not allowed to write.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, decisions, UIDS.accepted), { type: 'accepted' })
    await setDoc(doc(db, decisions, UIDS.substitute), { type: 'substitute' })
    await setDoc(doc(db, decisions, UIDS.interviewing), { type: 'interview' })
    await setDoc(doc(db, decisions, UIDS.rejected), { type: 'rejected' })
    await setDoc(doc(db, registrations, UIDS.student), {
      personal: { studentFirstName: 'Ada', dateOfBirth: '2014-01-01' },
    })
    await setDoc(doc(db, `users/${UIDS.student}`), {
      role: 'student',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
    await setDoc(doc(db, classes, `${UIDS.accepted}-1`), {
      course: 'Python 1',
      instructorUid: UIDS.accepted,
      otherInstructorUids: [],
    })
  })
})

describe("users/{uid} - the role field is not the client's to write", () => {
  it('lets a user read their own document', async () => {
    const db = as(UIDS.student, 'student')
    await assertSucceeds(getDoc(doc(db, `users/${UIDS.student}`)))
  })

  it("refuses a read of someone else's document", async () => {
    const db = as(UIDS.otherStudent, 'student')
    await assertFails(getDoc(doc(db, `users/${UIDS.student}`)))
  })

  it('lets a user change their own name', async () => {
    const db = as(UIDS.student, 'student')
    await assertSucceeds(
      updateDoc(doc(db, `users/${UIDS.student}`), { firstName: 'Augusta' }),
    )
  })

  it('refuses a self-promotion to instructor', async () => {
    const db = as(UIDS.student, 'student')
    await assertFails(
      updateDoc(doc(db, `users/${UIDS.student}`), { role: 'instructor' }),
    )
  })

  it('refuses a self-promotion to admin', async () => {
    const db = as(UIDS.student, 'student')
    await assertFails(
      setDoc(
        doc(db, `users/${UIDS.student}`),
        { role: 'admin' },
        { merge: true },
      ),
    )
  })

  it('refuses a role smuggled in alongside a legitimate name change', async () => {
    const db = as(UIDS.student, 'student')
    await assertFails(
      updateDoc(doc(db, `users/${UIDS.student}`), {
        firstName: 'Augusta',
        role: 'instructor',
      }),
    )
  })

  it('lets a user create a document that carries no role', async () => {
    // admin's userService.updateUserName uses setDoc(merge) so accounts
    // predating the users collection can still rename themselves.
    const db = as(UIDS.undecided, 'admin')
    await assertSucceeds(
      setDoc(doc(db, `users/${UIDS.undecided}`), { firstName: 'Grace' }),
    )
  })

  it('refuses a created document that assigns itself a role', async () => {
    const db = as(UIDS.undecided, 'student')
    await assertFails(
      setDoc(doc(db, `users/${UIDS.undecided}`), {
        firstName: 'Grace',
        role: 'instructor',
      }),
    )
  })

  it('lets a name change through setDoc(merge) on a document that has a role', async () => {
    // Both repos' userService.updateUserName use setDoc(merge) rather than
    // updateDoc. The merged result still carries the stored role, so the
    // unchanged-role check passes - but only because it compares the *merged*
    // document, which is worth pinning down.
    const db = as(UIDS.student, 'student')
    await assertSucceeds(
      setDoc(
        doc(db, `users/${UIDS.student}`),
        { firstName: 'Augusta', lastName: 'King' },
        { merge: true },
      ),
    )
  })

  it('lets a user delete their own document', async () => {
    // portal's rollbackNewUser and DeleteAccountForm both need this.
    const db = as(UIDS.student, 'student')
    await assertSucceeds(deleteDoc(doc(db, `users/${UIDS.student}`)))
  })

  it('refuses an admin promoting another user by document', async () => {
    // Even an admin changes roles through the Admin SDK, so that the claim
    // and the document can never disagree.
    const db = as(UIDS.admin, 'admin')
    await assertFails(
      updateDoc(doc(db, `users/${UIDS.student}`), { role: 'instructor' }),
    )
  })
})

describe('registrations - gated on the decision, not the role', () => {
  it('lets a student read their own registration', async () => {
    const db = as(UIDS.student, 'student')
    await assertSucceeds(getDoc(doc(db, registrations, UIDS.student)))
  })

  it("refuses a student reading another family's registration", async () => {
    const db = as(UIDS.otherStudent, 'student')
    await assertFails(getDoc(doc(db, registrations, UIDS.student)))
  })

  it('lets an accepted instructor read a registration', async () => {
    const db = as(UIDS.accepted, 'instructor')
    await assertSucceeds(getDoc(doc(db, registrations, UIDS.student)))
  })

  it('lets a substitute read a registration', async () => {
    // Substitutes cover individual sessions and need the roster for them.
    const db = as(UIDS.substitute, 'instructor')
    await assertSucceeds(getDoc(doc(db, registrations, UIDS.student)))
  })

  it('refuses an instructor still awaiting an interview', async () => {
    const db = as(UIDS.interviewing, 'instructor')
    await assertFails(getDoc(doc(db, registrations, UIDS.student)))
  })

  it('refuses a rejected instructor', async () => {
    const db = as(UIDS.rejected, 'instructor')
    await assertFails(getDoc(doc(db, registrations, UIDS.student)))
  })

  it('refuses an instructor with no decision at all', async () => {
    // The signup-day case: the role is held from the moment an account is
    // created, so this is what the old isStaff() read gave away.
    const db = as(UIDS.undecided, 'instructor')
    await assertFails(getDoc(doc(db, registrations, UIDS.student)))
  })

  it('lets an admin read a registration', async () => {
    const db = as(UIDS.admin, 'admin')
    await assertSucceeds(getDoc(doc(db, registrations, UIDS.student)))
  })

  it('lets a reviewer read a registration', async () => {
    const db = as(UIDS.reviewer, 'reviewer')
    await assertSucceeds(getDoc(doc(db, registrations, UIDS.student)))
  })
})

describe('classes - teaching requires having been accepted to teach', () => {
  it('lets an accepted instructor create a class under their own uid', async () => {
    const db = as(UIDS.accepted, 'instructor')
    await assertSucceeds(
      setDoc(doc(db, classes, `${UIDS.accepted}-2`), { course: 'Python 1' }),
    )
  })

  it('refuses a class create by an instructor awaiting an interview', async () => {
    const db = as(UIDS.interviewing, 'instructor')
    await assertFails(
      setDoc(doc(db, classes, `${UIDS.interviewing}-1`), {
        course: 'Python 1',
      }),
    )
  })

  it("refuses a class create under another instructor's uid", async () => {
    const db = as(UIDS.accepted, 'instructor')
    await assertFails(
      setDoc(doc(db, classes, `${UIDS.substitute}-1`), { course: 'Python 1' }),
    )
  })

  it('lets an accepted instructor update their own class', async () => {
    const db = as(UIDS.accepted, 'instructor')
    await assertSucceeds(
      updateDoc(doc(db, classes, `${UIDS.accepted}-1`), {
        meetingLink: 'https://teams.example/join',
      }),
    )
  })

  it("refuses an update to a class the caller doesn't teach", async () => {
    const db = as(UIDS.substitute, 'instructor')
    await assertFails(
      updateDoc(doc(db, classes, `${UIDS.accepted}-1`), {
        meetingLink: 'https://evil.example/join',
      }),
    )
  })

  it('lets a co-instructor update the class', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), classes, `${UIDS.accepted}-1`),
        {
          instructorUid: UIDS.accepted,
          otherInstructorUids: [UIDS.substitute],
        },
        { merge: true },
      )
      await setDoc(doc(context.firestore(), decisions, UIDS.substitute), {
        type: 'accepted',
      })
    })
    const db = as(UIDS.substitute, 'instructor')
    await assertSucceeds(
      updateDoc(doc(db, classes, `${UIDS.accepted}-1`), {
        meetingLink: 'https://teams.example/join',
      }),
    )
  })
})

describe('classes - legacy documents', () => {
  it('lets the owner update a class that predates otherInstructorUids', async () => {
    // 44 classes from Spring24/Fall24 carry no otherInstructorUids field, and
    // rules error rather than return null when a map key is missing - so
    // isInstructorOfClass()'s null guards are load-bearing. Adding the
    // acceptance check to this rule must not have changed that.
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), classes, `${UIDS.accepted}-9`), {
        course: 'Python 1',
        instructorUid: UIDS.accepted,
      })
    })
    const db = as(UIDS.accepted, 'instructor')
    await assertSucceeds(
      updateDoc(doc(db, classes, `${UIDS.accepted}-9`), {
        meetingLink: 'https://teams.example/join',
      }),
    )
  })
})

describe('mail - the trigger-email queue is server-only', () => {
  it('refuses a signed-in user queueing an email', async () => {
    const db = as(UIDS.student, 'student')
    await assertFails(
      setDoc(doc(db, 'mail/spam-1'), {
        to: 'victim@example.com',
        message: { subject: 'Hello', html: '<p>Hi</p>' },
      }),
    )
  })
})

describe('the escalation this change closes, end to end', () => {
  it('a student cannot write themselves into instructor access', async () => {
    const db = as(UIDS.student, 'student')

    // Step 1, which used to work: claim the role in your own document.
    await assertFails(
      setDoc(
        doc(db, `users/${UIDS.student}`),
        { role: 'instructor' },
        { merge: true },
      ),
    )

    // Step 2, which the write above used to unlock. Denied on its own merits
    // now too: the rules read the Auth claim, so even a forged document would
    // not have helped.
    await assertFails(getDoc(doc(db, registrations, UIDS.otherStudent)))
  })
})
