// backfill-interviewer-uids.ts - One-time backfill for interview slot
// interviewer uid migration.
//
// Background: interview slot documents used to identify their interviewer by
// `interviewerEmail` only. If an interviewer later changed their account email
// address, their existing slots were orphaned because permission checks and
// filtering compared `interviewerEmail` against the live Auth email. PR #65
// added `interviewerUid` to identify interview slot ownership stably, falling
// back to `interviewerEmail` if an account was deleted or uid is missing.
//
// This script walks all interview slot documents across all semesters in Firestore
// (`semesters/{semesterId}/instructorInterviewTimes`), looks up the interviewer's
// UID via Firebase Auth using `interviewerEmail`, and stamps `interviewerUid` onto
// each slot. We retain email as a permanent record of the primary instructor if
// an account is deleted, though that fallback is rare. Stored email is unreliable
// because an interviewer could change their email later, so code should avoid using it.
//
// If an account cannot be found for the given email (e.g. account deleted or
// email changed), or if `interviewerEmail` is missing or invalid, the script emits
// a warning and skips updating that document, leaving the slot intact with its
// original `interviewerEmail` fallback.
//
// Usage:
//   npx tsx scripts/backfill-interviewer-uids.ts
//   npx tsx scripts/backfill-interviewer-uids.ts --dry-run
//   npx tsx scripts/backfill-interviewer-uids.ts --production
//   npx tsx scripts/backfill-interviewer-uids.ts --dry-run --production
//
// Idempotent: only updates documents that still need an interviewerUid, so re-running
// after a partial failure is safe.
import admin from 'firebase-admin'
import collectionsList from '../src/lib/data/collectionsList.json'
import { semesterCollectionPath } from '../src/lib/data/collections'
import {
  extractInterviewerEmail,
  interviewSlotNeedsUidBackfill,
} from './lib/interviewerUidBackfillTransforms'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isProduction = args.includes('--production')

if (isProduction) {
  if (
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    console.error(
      'Refusing to run with --production while FIRESTORE_EMULATOR_HOST or ' +
        'FIREBASE_AUTH_EMULATOR_HOST is set in the environment. Unset them, ' +
        'or remove --production to target the emulator instead.',
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
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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

type Resolution = { uid: string } | { reason: string }

/**
 * Resolves an email address to a Firebase Auth UID.
 *
 * Cached because an interviewer typically has multiple slots across a semester,
 * and misses/hits avoid redundant Auth round trips.
 */
const resolutionCache = new Map<string, Resolution>()

async function resolveInterviewerUid(email: string): Promise<Resolution> {
  const cached = resolutionCache.get(email)
  if (cached) return cached

  let resolution: Resolution
  try {
    const user = await auth.getUserByEmail(email)
    resolution = { uid: user.uid }
  } catch (err: any) {
    resolution = {
      reason: err?.message || 'No account found for this email address',
    }
  }

  resolutionCache.set(email, resolution)
  return resolution
}

type PlannedWrite = {
  id: string
  ref: FirebaseFirestore.DocumentReference
  interviewerUid: string
  interviewerEmail: string
}

async function backfillSemesterInterviewSlots(semesterId: string) {
  const path = semesterCollectionPath(semesterId, 'instructorInterviewTimes')
  const snapshot = await db.collection(path).get()
  const toUpdate = snapshot.docs.filter((doc) =>
    interviewSlotNeedsUidBackfill(doc.data()),
  )

  if (toUpdate.length === 0) {
    console.log(`  ${path}: ${snapshot.size} docs, none need backfilling.`)
    return { path, count: 0, warnings: 0 }
  }

  console.log(
    `  ${path}: ${toUpdate.length}/${snapshot.size} docs still lack interviewerUid.`,
  )

  const planned: PlannedWrite[] = []
  let warnings = 0

  for (const doc of toUpdate) {
    const data = doc.data()
    const email = extractInterviewerEmail(data)

    if (!email) {
      warnings += 1
      console.warn(
        `    WARNING: ${semesterId}/${doc.id} has no valid interviewerEmail; skipping update.`,
      )
      continue
    }

    const resolution = await resolveInterviewerUid(email)
    if ('uid' in resolution) {
      planned.push({
        id: doc.id,
        ref: doc.ref,
        interviewerUid: resolution.uid,
        interviewerEmail: email,
      })
    } else {
      warnings += 1
      console.warn(
        `    WARNING: ${semesterId}/${doc.id}: could not find UID for "${email}" (${resolution.reason}); skipping update.`,
      )
    }
  }

  if (planned.length === 0) {
    console.log(`    nothing writable here; see any warnings above.`)
    return { path, count: 0, warnings }
  }

  if (isDryRun) {
    for (const write of planned.slice(0, SAMPLE_SIZE)) {
      console.log(
        `    [dry-run sample] ${write.id}: interviewerUid -> ${write.interviewerUid} (interviewerEmail "${write.interviewerEmail}" retained)`,
      )
    }
    return { path, count: planned.length, warnings }
  }

  let committed = 0
  for (const batchDocs of chunk(planned, BATCH_LIMIT)) {
    const batch = db.batch()
    for (const write of batchDocs) {
      batch.update(write.ref, {
        interviewerUid: write.interviewerUid,
      })
    }
    await batch.commit()
    committed += batchDocs.length
    console.log(`    committed ${committed}/${planned.length}`)
  }

  return { path, count: planned.length, warnings }
}

async function main() {
  const semesters = (collectionsList as { id: string; name: string }[]).map(
    (s) => s.id,
  )
  console.log(
    `${isDryRun ? '[DRY RUN] ' : ''}Backfilling interview slot interviewer uids across ` +
      `${semesters.length} semester(s): ${semesters.join(', ')}\n`,
  )

  let totalDocs = 0
  let totalWarnings = 0
  for (const semesterId of semesters) {
    console.log(`Semester ${semesterId}:`)
    const result = await backfillSemesterInterviewSlots(semesterId)
    totalDocs += result.count
    totalWarnings += result.warnings
  }

  console.log(
    `\n${isDryRun ? '[DRY RUN] Would backfill' : 'Backfilled'} ${totalDocs} interview slot document(s) ` +
      `across ${semesters.length} semester(s).`,
  )
  if (totalWarnings > 0) {
    console.warn(
      `\n${totalWarnings} interview slot(s) could not be resolved to an Auth UID - see the WARNING lines above. ` +
        `Their updates were skipped and they retain interviewerEmail as a fallback.`,
    )
  }
}

main().catch((err) => {
  console.error('Backfill script failed:', err)
  process.exit(1)
})
