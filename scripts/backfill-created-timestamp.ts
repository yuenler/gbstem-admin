// backfill-created-timestamp.ts - One-time backfill for registration/application documents
// whose timestamps.created was never set. Every registration and application document
// created through the portal's student-facing forms had timestamps.created hardcoded to
// null (createEmptyRegistration/createEmptyApplication in ../portal/src/lib/helpers), and
// no write path ever replaced it with a real timestamp - every save only ever stamped
// timestamps.updated. This is why the admin students/registrations/applications pages could
// 500 on `data.timestamps.created.toDate()`. The portal write path is now fixed (it
// self-heals timestamps.created on a document's next save), but documents that won't be
// saved again by their owner - submitted, enrolled, decided - stay broken until backfilled
// here.
//
// Since the timestamps.created field itself can't be trusted, this uses each document's own
// Firestore-maintained `createTime` metadata (the actual creation time Firestore records,
// independent of any field data) as the backfill value.
//
// Usage:
//   npx tsx scripts/backfill-created-timestamp.ts             Backfill applications + registrations
//   npx tsx scripts/backfill-created-timestamp.ts --dry-run    Preview counts + a sample, no writes
//   npx tsx scripts/backfill-created-timestamp.ts --production Target production instead of the emulator
//                                                     (requires FIREBASE_CLIENT_EMAIL,
//                                                     FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID
//                                                     or GOOGLE_APPLICATION_CREDENTIALS already
//                                                     set in the environment - not loaded from
//                                                     any .env file by this script)
//
// Idempotent: only writes documents whose timestamps.created is still missing/null, so
// re-running after a partial failure or to catch newly-discovered legacy documents is safe.
import admin from 'firebase-admin'
import collectionsList from '../src/lib/data/collectionsList.json'
import { semesterCollectionPath } from '../src/lib/data/collections'
import { timestampsNeedBackfill } from './lib/backfillTimestampTransforms'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isProduction = args.includes('--production')

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
  process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-gbstem'
  console.log('Connecting to Firebase emulators at:')
  console.log(`- Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`)
  console.log(`- Project ID: ${process.env.GCLOUD_PROJECT}\n`)
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT })
}

const db = admin.firestore()

const SAMPLE_SIZE = 5 // docs shown in --dry-run output
const BATCH_LIMIT = 500 // Firestore batched-write limit

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function backfillCollection(path: string, label: string) {
  const snapshot = await db.collection(path).get()
  const toUpdate = snapshot.docs.filter((doc) =>
    timestampsNeedBackfill(doc.data().timestamps),
  )

  if (toUpdate.length === 0) {
    console.log(`  ${path}: ${snapshot.size} ${label}, none need backfilling.`)
    return { path, count: 0 }
  }

  console.log(
    `  ${path}: ${toUpdate.length}/${snapshot.size} ${label} missing timestamps.created.`,
  )

  if (isDryRun) {
    for (const doc of toUpdate.slice(0, SAMPLE_SIZE)) {
      console.log(
        `    [dry-run sample] ${doc.id}: timestamps.created -> ${doc.createTime
          .toDate()
          .toISOString()} (doc's own Firestore createTime)`,
      )
    }
    return { path, count: toUpdate.length }
  }

  let committed = 0
  for (const batchDocs of chunk(toUpdate, BATCH_LIMIT)) {
    const batch = db.batch()
    for (const doc of batchDocs) {
      batch.update(doc.ref, { 'timestamps.created': doc.createTime })
    }
    await batch.commit()
    committed += batchDocs.length
    console.log(`    committed ${committed}/${toUpdate.length}`)
  }

  return { path, count: toUpdate.length }
}

async function main() {
  const semesters = (collectionsList as { id: string; name: string }[]).map(
    (s) => s.id,
  )
  console.log(
    `${isDryRun ? '[DRY RUN] ' : ''}Backfilling timestamps.created across ${semesters.length} semester(s): ` +
      `${semesters.join(', ')}`,
  )

  let totalDocs = 0
  for (const semesterId of semesters) {
    console.log(`\nSemester ${semesterId}:`)
    totalDocs += (
      await backfillCollection(
        semesterCollectionPath(semesterId, 'applications'),
        'applications',
      )
    ).count
    totalDocs += (
      await backfillCollection(
        semesterCollectionPath(semesterId, 'registrations'),
        'registrations',
      )
    ).count
  }

  console.log(
    `\n${isDryRun ? '[DRY RUN] Would backfill' : 'Backfilled'} ${totalDocs} total document(s) ` +
      `across ${semesters.length} semester(s).`,
  )
}

main().catch((err) => {
  console.error('Backfill script failed:', err)
  process.exit(1)
})
