// backfill-other-instructor-uids.ts - One-time backfill for the co-instructor
// uid migration.
//
// Class documents used to record co-instructors as `otherInstructorEmails`, a
// free-text comma-separated string the class owner typed by hand, which
// firestore.rules's isInstructorOfClass() honoured directly - so any address
// at all could be given write access to a class, with no check that the person
// had ever been interviewed or accepted. Co-instructors are now stored as
// `otherInstructorUids` only, and the portal will only add a uid whose account
// is an instructor with an `accepted` decision for that semester. This script
// converts what is already in Firestore, dropping (and logging) every address
// that doesn't meet that bar so leadership can follow up on it.
//
// Usage:
//   npx tsx scripts/backfill-other-instructor-uids.ts
//       Phase 1: stamp otherInstructorUids, KEEP otherInstructorEmails.
//   npx tsx scripts/backfill-other-instructor-uids.ts --drop-legacy-field
//       Phase 2: also delete the otherInstructorEmails field.
//   ... --dry-run       Preview counts + a sample, no writes
//   ... --production    Target production instead of the emulator
//                       (requires FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
//                       FIREBASE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS
//                       already set in the environment - not loaded from any
//                       .env file by this script)
//
// DEPLOY ORDER - the two phases exist because the legacy field has to outlive
// the app deploy. Skipping a step silently costs somebody their class access:
//
//   1. Run phase 1 with --dry-run, review the dropped-address log with a lead.
//   2. Run phase 1 for real. Old app builds keep working: the string is still
//      there, and firestore.rules still grants on it.
//   3. Deploy the portal and admin app code.
//   4. Run phase 2 (--drop-legacy-field) to remove the now-unread string.
//   5. LAST: deploy firestore.rules with the otherInstructorEmails clause of
//      isInstructorOfClass() removed.
//
// Doing step 5 before step 4 completes locks out any co-instructor whose
// address never resolved to a uid; doing step 4 before step 3 lets an old
// build write `otherInstructorUids: []` back over what step 2 stamped.
//
// Idempotent: only writes documents that still need changing, so re-running
// after a partial failure is safe.
import admin from 'firebase-admin'
import collectionsList from '../src/lib/data/collectionsList.json'
import { semesterCollectionPath } from '../src/lib/data/collections'
import {
  classNeedsCoInstructorBackfill,
  mergeCoInstructorUids,
  parseLegacyOtherInstructorEmails,
} from './lib/coInstructorBackfillTransforms'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isProduction = args.includes('--production')
const dropLegacyField = args.includes('--drop-legacy-field')

if (isProduction) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      'Refusing to run with --production while FIRESTORE_EMULATOR_HOST is set in the ' +
        'environment. Unset it, or remove --production to target the emulator instead.',
    )
    process.exit(1)
  }
  const hasCertCreds =
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_PROJECT_ID
  if (!hasCertCreds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Refusing to run with --production: no credentials found in the environment. Set ' +
        'FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_PROJECT_ID (the same ' +
        'variables src/lib/server/firebase.ts uses, e.g. sourced from .env.local.prod), or ' +
        'GOOGLE_APPLICATION_CREDENTIALS.',
    )
    process.exit(1)
  }
  console.log(
    `Connecting to PRODUCTION Firestore project ` +
      `"${process.env.FIREBASE_PROJECT_ID ?? '(resolved via GOOGLE_APPLICATION_CREDENTIALS)'}"...`,
  )
  admin.initializeApp(
    hasCertCreds
      ? {
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
          }),
        }
      : undefined,
  )
} else {
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
  process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-gbstem'
  console.log('Connecting to Firebase emulators at:')
  console.log(`- Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`)
  console.log(`- Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`)
  console.log(`- Project ID: ${process.env.GCLOUD_PROJECT}\n`)
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT })
}

const db = admin.firestore()
const auth = admin.auth()

const SAMPLE_SIZE = 5 // docs shown in --dry-run output
const BATCH_LIMIT = 500 // Firestore batched-write limit

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

type Resolution =
  { uid: string } | { reason: 'no account' | 'not an instructor' | string }

/**
 * Resolves one legacy address to an accepted instructor's uid, or explains
 * why it can't be. Eligibility is checked against *that class's* semester,
 * not the current one: someone accepted in Spring25 was not thereby accepted
 * to teach in Fall26.
 *
 * Cached because a co-instructor typically appears on several classes, and
 * each miss costs an Auth round trip.
 */
const resolutionCache = new Map<string, Resolution>()

async function resolveAcceptedInstructor(
  email: string,
  semesterId: string,
): Promise<Resolution> {
  const cacheKey = `${semesterId}:${email}`
  const cached = resolutionCache.get(cacheKey)
  if (cached) return cached

  const resolution = await resolveUncached(email, semesterId)
  resolutionCache.set(cacheKey, resolution)
  return resolution
}

async function resolveUncached(
  email: string,
  semesterId: string,
): Promise<Resolution> {
  let user: admin.auth.UserRecord
  try {
    user = await auth.getUserByEmail(email)
  } catch {
    return { reason: 'no account' }
  }
  if (user.customClaims?.role !== 'instructor') {
    return { reason: 'not an instructor' }
  }

  const decisionSnap = await db
    .doc(`${semesterCollectionPath(semesterId, 'decisions')}/${user.uid}`)
    .get()
  const decisionType = decisionSnap.exists
    ? (decisionSnap.data()?.type as string | undefined)
    : undefined
  if (decisionType !== 'accepted') {
    return { reason: `decision=${decisionType ?? 'none'}` }
  }
  return { uid: user.uid }
}

type PlannedWrite = {
  id: string
  ref: FirebaseFirestore.DocumentReference
  uids: string[]
  changed: boolean
}

async function backfillClasses(semesterId: string) {
  const path = semesterCollectionPath(semesterId, 'classes')
  const snapshot = await db.collection(path).get()
  const toUpdate = snapshot.docs.filter((doc) =>
    classNeedsCoInstructorBackfill(doc.data(), { dropLegacyField }),
  )

  if (toUpdate.length === 0) {
    console.log(`  ${path}: ${snapshot.size} docs, none need backfilling.`)
    return { path, count: 0, dropped: 0 }
  }

  console.log(
    `  ${path}: ${toUpdate.length}/${snapshot.size} docs need backfilling.`,
  )

  const planned: PlannedWrite[] = []
  let dropped = 0

  for (const doc of toUpdate) {
    const data = doc.data()
    const emails = parseLegacyOtherInstructorEmails(data.otherInstructorEmails)
    const resolvedUids: string[] = []

    for (const email of emails) {
      const resolution = await resolveAcceptedInstructor(email, semesterId)
      if ('uid' in resolution) {
        resolvedUids.push(resolution.uid)
      } else {
        // Logged individually and never summarised away: each of these is a
        // real person who was listed as teaching a class and will stop being
        // able to edit it, and somebody has to decide whether that is right.
        dropped += 1
        console.log(
          `    DROPPED ${semesterId}/${doc.id}: ${email} (${resolution.reason})`,
        )
      }
    }

    const existing = Array.isArray(data.otherInstructorUids)
      ? (data.otherInstructorUids as string[])
      : []
    const uids = mergeCoInstructorUids(existing, resolvedUids)
    planned.push({
      id: doc.id,
      ref: doc.ref,
      uids,
      changed: uids.length !== existing.length,
    })
  }

  if (isDryRun) {
    for (const write of planned.slice(0, SAMPLE_SIZE)) {
      console.log(
        `    [dry-run sample] ${write.id}: otherInstructorUids -> ` +
          `[${write.uids.join(', ')}]` +
          (dropLegacyField ? ', removing otherInstructorEmails' : ''),
      )
    }
    return { path, count: planned.length, dropped }
  }

  let committed = 0
  for (const batchDocs of chunk(planned, BATCH_LIMIT)) {
    const batch = db.batch()
    for (const write of batchDocs) {
      const update: Record<string, unknown> = {
        otherInstructorUids: write.uids,
      }
      if (dropLegacyField) {
        update.otherInstructorEmails = admin.firestore.FieldValue.delete()
      }
      batch.update(write.ref, update)
    }
    await batch.commit()
    committed += batchDocs.length
    console.log(`    committed ${committed}/${planned.length}`)
  }

  return { path, count: planned.length, dropped }
}

async function main() {
  const semesters = (collectionsList as { id: string; name: string }[]).map(
    (s) => s.id,
  )
  console.log(
    `${isDryRun ? '[DRY RUN] ' : ''}Backfilling co-instructor uids across ` +
      `${semesters.length} semester(s): ${semesters.join(', ')}`,
  )
  console.log(
    dropLegacyField
      ? 'Phase 2: stamping uids AND removing the legacy otherInstructorEmails field.\n'
      : 'Phase 1: stamping uids only, leaving otherInstructorEmails in place ' +
          '(pass --drop-legacy-field once the apps are deployed).\n',
  )

  let totalDocs = 0
  let totalDropped = 0
  for (const semesterId of semesters) {
    console.log(`\nSemester ${semesterId}:`)
    const result = await backfillClasses(semesterId)
    totalDocs += result.count
    totalDropped += result.dropped
  }

  console.log(
    `\n${isDryRun ? '[DRY RUN] Would backfill' : 'Backfilled'} ${totalDocs} class document(s) ` +
      `across ${semesters.length} semester(s).`,
  )
  if (totalDropped > 0) {
    console.log(
      `${totalDropped} co-instructor address(es) were dropped - see the DROPPED lines above. ` +
        `Each is somebody who was listed on a class but is not an accepted instructor for ` +
        `that semester; check with gbSTEM leadership before treating this as done.`,
    )
  }
}

main().catch((err) => {
  console.error('Backfill script failed:', err)
  process.exit(1)
})
