// migrate-semesters.ts - One-time migration from per-semester flat Firestore collections
// (`{type}{Semester}`, e.g. `applicationsSpring26`) to semester-scoped subcollections
// (`semesters/{Semester}/{type}`). See SEMESTER_MIGRATION_PLAN.md § 4 for the full design
// and § 6 for the production rollout sequence (which this script does not perform on its
// own — it only ever copies data when explicitly told to, per the flags below).
//
// Usage:
//   npx tsx scripts/migrate-semesters.ts             Copy legacy collections -> new schema
//   npx tsx scripts/migrate-semesters.ts --dry-run    Preview counts + a sample, no writes
//   npx tsx scripts/migrate-semesters.ts --verify     Compare source vs. already-migrated target
//   npx tsx scripts/migrate-semesters.ts --production Target production instead of the emulator
//                                                      (requires FIREBASE_CLIENT_EMAIL,
//                                                      FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID
//                                                      or GOOGLE_APPLICATION_CREDENTIALS already
//                                                      set in the environment - not loaded from
//                                                      any .env file by this script)
//
// Copy-only and idempotent: source collections are never modified or deleted (they're the
// rollback plan), and re-running overwrites targets deterministically.
import admin from 'firebase-admin'
import collectionsList from '../src/lib/data/collectionsList.json'
import {
  semesterCollectionPath,
  withSemester,
} from '../src/lib/data/collections'
import {
  LEGACY_COLLECTION_TYPES,
  compareMigratedDoc,
  legacyCollectionName,
  rewriteLegacyPath,
  type LegacyCollectionType,
} from './lib/migrationTransforms'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isVerify = args.includes('--verify')
const isProduction = args.includes('--production')

if (isDryRun && isVerify) {
  console.error(
    '--dry-run and --verify cannot be combined; run them separately.',
  )
  process.exit(1)
}

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
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
  process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-gbstem'
  console.log('Connecting to Firebase emulators at:')
  console.log(`- Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`)
  console.log(`- Project ID: ${process.env.GCLOUD_PROJECT}\n`)
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT })
}

const db = admin.firestore()

const SAMPLE_SIZE = 5 // docs shown in --dry-run output / deep-compared per collection in --verify
const BATCH_LIMIT = 500 // Firestore batched-write limit

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function sampleFrom<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

// Firestore DocumentReference/Timestamp instances aren't directly JSON-serializable in a
// readable way (and Timestamp's own toJSON isn't ISO-formatted), so render them as short
// human-readable strings for --dry-run sample output.
function serializeForDisplay(value: any): any {
  if (value === null || value === undefined) return value
  if (typeof value?.path === 'string' && typeof value?.isEqual === 'function') {
    return `<ref: ${value.path}>`
  }
  if (typeof value?.toDate === 'function') {
    return `<timestamp: ${value.toDate().toISOString()}>`
  }
  if (Array.isArray(value)) return value.map(serializeForDisplay)
  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const key of Object.keys(value))
      out[key] = serializeForDisplay(value[key])
    return out
  }
  return value
}

function transformDoc(
  data: admin.firestore.DocumentData,
  semesterId: string,
): admin.firestore.DocumentData {
  const stamped = withSemester(data, semesterId)
  const decisionRef = stamped.meta?.decision
  if (decisionRef && typeof decisionRef.path === 'string') {
    stamped.meta = {
      ...stamped.meta,
      decision: db.doc(rewriteLegacyPath(decisionRef.path)),
    }
  }
  return stamped
}

async function warnOnUnexpectedSubcollections(
  doc: admin.firestore.QueryDocumentSnapshot,
  sourceName: string,
) {
  const subcollections = await doc.ref.listCollections()
  if (subcollections.length > 0) {
    console.warn(
      `  ⚠ ${sourceName}/${doc.id} has ${subcollections.length} subcollection(s) ` +
        `(${subcollections.map((c) => c.id).join(', ')}) that this migration does not copy.`,
    )
  }
}

async function migrateCollection(
  type: LegacyCollectionType,
  semesterId: string,
) {
  const sourceName = legacyCollectionName(type, semesterId)
  const targetPath = semesterCollectionPath(semesterId, type)
  const snapshot = await db.collection(sourceName).get()

  if (snapshot.empty) {
    console.log(`  ${sourceName}: 0 docs, skipping.`)
    return { sourceName, targetPath, count: 0 }
  }

  console.log(`  ${sourceName}: ${snapshot.size} docs -> ${targetPath}`)

  for (const doc of snapshot.docs) {
    await warnOnUnexpectedSubcollections(doc, sourceName)
  }

  if (isDryRun) {
    for (const doc of snapshot.docs.slice(0, SAMPLE_SIZE)) {
      const transformed = transformDoc(doc.data(), semesterId)
      console.log(
        `    [dry-run sample] ${doc.id}:`,
        JSON.stringify(serializeForDisplay(transformed)),
      )
    }
    return { sourceName, targetPath, count: snapshot.size }
  }

  let committed = 0
  for (const batchDocs of chunk(snapshot.docs, BATCH_LIMIT)) {
    const batch = db.batch()
    for (const doc of batchDocs) {
      const transformed = transformDoc(doc.data(), semesterId)
      batch.set(db.doc(`${targetPath}/${doc.id}`), transformed)
    }
    await batch.commit()
    committed += batchDocs.length
    console.log(`    committed ${committed}/${snapshot.size}`)
  }

  return { sourceName, targetPath, count: snapshot.size }
}

async function migrate() {
  const semesters = (collectionsList as { id: string; name: string }[]).map(
    (s) => s.id,
  )
  console.log(
    `${isDryRun ? '[DRY RUN] ' : ''}Migrating ${semesters.length} semester(s): ` +
      `${semesters.join(', ')}`,
  )

  let totalDocs = 0
  for (const semesterId of semesters) {
    console.log(`\nSemester ${semesterId}:`)
    for (const type of LEGACY_COLLECTION_TYPES) {
      const result = await migrateCollection(type, semesterId)
      totalDocs += result.count
    }
  }

  console.log(
    `\n${isDryRun ? '[DRY RUN] Would migrate' : 'Migrated'} ${totalDocs} total document(s) ` +
      `across ${semesters.length} semester(s).`,
  )
}

async function verifyCollection(
  type: LegacyCollectionType,
  semesterId: string,
) {
  const sourceName = legacyCollectionName(type, semesterId)
  const targetPath = semesterCollectionPath(semesterId, type)
  const [sourceSnap, targetSnap] = await Promise.all([
    db.collection(sourceName).get(),
    db.collection(targetPath).get(),
  ])

  let ok = true

  if (sourceSnap.size !== targetSnap.size) {
    ok = false
    console.error(
      `  ✗ ${sourceName}: source has ${sourceSnap.size} doc(s), ` +
        `target ${targetPath} has ${targetSnap.size}.`,
    )
  } else if (sourceSnap.size === 0) {
    console.log(`  ${sourceName}: 0 docs, skipping sample comparison.`)
    return ok
  } else {
    console.log(`  ${sourceName}: ${sourceSnap.size} docs, counts match.`)
  }

  const targetById = new Map(targetSnap.docs.map((d) => [d.id, d]))
  for (const sourceDoc of sampleFrom(sourceSnap.docs, SAMPLE_SIZE)) {
    const targetDoc = targetById.get(sourceDoc.id)
    if (!targetDoc) {
      ok = false
      console.error(
        `  ✗ ${sourceName}/${sourceDoc.id}: missing from ${targetPath}.`,
      )
      continue
    }
    const { matches, mismatches } = compareMigratedDoc(
      sourceDoc.data(),
      targetDoc.data(),
      semesterId,
    )
    if (!matches) {
      ok = false
      console.error(
        `  ✗ ${sourceName}/${sourceDoc.id}: ${mismatches.join('; ')}`,
      )
    }
  }

  return ok
}

async function verify() {
  const semesters = (collectionsList as { id: string; name: string }[]).map(
    (s) => s.id,
  )
  console.log(
    `Verifying ${semesters.length} semester(s): ${semesters.join(', ')}`,
  )

  let allOk = true
  for (const semesterId of semesters) {
    console.log(`\nSemester ${semesterId}:`)
    for (const type of LEGACY_COLLECTION_TYPES) {
      const ok = await verifyCollection(type, semesterId)
      allOk = allOk && ok
    }
  }

  if (allOk) {
    console.log(
      '\nVerification passed: all collection counts match and sampled docs are ' +
        'structurally equal.',
    )
  } else {
    console.error('\nVerification FAILED - see mismatches above.')
    process.exitCode = 1
  }
}

async function main() {
  if (isVerify) {
    await verify()
  } else {
    await migrate()
  }
}

main().catch((err) => {
  console.error('Migration script failed:', err)
  process.exit(1)
})
