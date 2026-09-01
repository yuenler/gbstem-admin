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
// Every document it touches is listed with the email address(es) associated with it - the
// signed-in account's address from Firebase Auth, plus personal.email/secondaryEmail from
// the document itself when they differ - followed by a de-duplicated address list for the
// whole run. Since the portal write path is fixed, anything still showing up here is worth
// chasing: either a write path that fix missed, or a specific person whose long-lived
// browser session is still running the old code and needs a reload.
//
// TODO(known hole, as of 2026-08-31): portal's RegistrationForm bootstrap
// (RegistrationForm.svelte, the `bootstrapRegistration(childUid, values)` call) writes a
// brand-new registration straight from createEmptyRegistration(), whose timestamps.created
// is null - it never goes through registrationOwnedFields(), so the PR #61 self-heal
// doesn't apply to it. Every new registration draft therefore lands here until its parent
// saves once more. ApplyForm's equivalent path does go through applicationOwnedFields and
// is fine. Fix that before tightening firestore.rules to reject created-clearing writes,
// or parents won't be able to start a registration at all.
//
// Idempotent: only writes documents whose timestamps.created is still missing/null, so
// re-running after a partial failure or to catch newly-discovered legacy documents is safe.
import admin from 'firebase-admin'
import collectionsList from '../src/lib/data/collectionsList.json'
import { semesterCollectionPath } from '../src/lib/data/collections'
import {
  contactableEmails,
  formatIdentityEmails,
  identityFromDoc,
  timestampsNeedBackfill,
  type BackfillIdentity,
} from './lib/backfillTimestampTransforms'

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
  // The email listing looks accounts up through admin.auth(), which would otherwise try
  // to reach production Auth (and fail for want of credentials) even on an emulator run.
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

const BATCH_LIMIT = 500 // Firestore batched-write limit
const AUTH_LOOKUP_LIMIT = 100 // auth.getUsers() identifiers-per-call limit

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

// Looks up the signed-in account email for each uid. `getUsers` reports uids it doesn't
// know in `notFound` rather than throwing, so a since-deleted account just yields no
// email. It does throw on a malformed uid, though, which would take down the whole run
// over one bad document id - hence the per-uid fallback.
async function resolveAuthEmails(uids: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>()
  for (const batch of chunk([...new Set(uids)], AUTH_LOOKUP_LIMIT)) {
    let users: admin.auth.UserRecord[]
    try {
      users = (await auth.getUsers(batch.map((uid) => ({ uid })))).users
    } catch {
      users = (
        await Promise.all(
          batch.map((uid) => auth.getUser(uid).catch(() => null)),
        )
      ).filter((user): user is admin.auth.UserRecord => user !== null)
    }
    for (const user of users) {
      if (user.email) resolved.set(user.uid, user.email)
    }
  }
  return resolved
}

async function backfillCollection(path: string, label: string) {
  const snapshot = await db.collection(path).get()
  const toUpdate = snapshot.docs.filter((doc) =>
    timestampsNeedBackfill(doc.data().timestamps),
  )

  if (toUpdate.length === 0) {
    console.log(`  ${path}: ${snapshot.size} ${label}, none need backfilling.`)
    return { path, count: 0, identities: [] as BackfillIdentity[] }
  }

  console.log(
    `  ${path}: ${toUpdate.length}/${snapshot.size} ${label} missing timestamps.created.`,
  )

  const identities = toUpdate.map((doc) => identityFromDoc(doc.id, doc.data()))
  const authEmails = await resolveAuthEmails(identities.map((i) => i.authUid))
  for (const identity of identities) {
    identity.authEmail = authEmails.get(identity.authUid) ?? null
  }

  // Every affected document is listed, not a sample, and in real runs as well as dry
  // runs: the portal write path is supposed to be fixed, so anything still turning up
  // here is either a hole that fix missed or a specific person on a stale browser
  // session, and both need the owner's address to chase down.
  identities.forEach((identity, i) => {
    console.log(
      `    ${identity.docId}: ${formatIdentityEmails(identity)}` +
        ` (timestamps.created -> ${toUpdate[i].createTime.toDate().toISOString()})`,
    )
  })

  if (isDryRun) {
    return { path, count: toUpdate.length, identities }
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

  return { path, count: toUpdate.length, identities }
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
  const allIdentities: BackfillIdentity[] = []
  for (const semesterId of semesters) {
    console.log(`\nSemester ${semesterId}:`)
    for (const name of ['applications', 'registrations'] as const) {
      const result = await backfillCollection(
        semesterCollectionPath(semesterId, name),
        name,
      )
      totalDocs += result.count
      allIdentities.push(...result.identities)
    }
  }

  console.log(
    `\n${isDryRun ? '[DRY RUN] Would backfill' : 'Backfilled'} ${totalDocs} total document(s) ` +
      `across ${semesters.length} semester(s).`,
  )

  // One de-duplicated address list for the whole run. A person who shows up here after
  // the portal write path was fixed is the one to ask to reload their browser - or the
  // lead on whichever write path is still clearing the field.
  if (allIdentities.length > 0) {
    const emails = [...new Set(allIdentities.flatMap(contactableEmails))].sort()
    console.log(
      `\nAssociated email address(es), ${emails.length} distinct across ` +
        `${allIdentities.length} document(s):`,
    )
    for (const email of emails) {
      console.log(`  ${email}`)
    }
    const noEmail = allIdentities.filter(
      (identity) => contactableEmails(identity).length === 0,
    )
    if (noEmail.length > 0) {
      console.log(
        `  (${noEmail.length} document(s) had no email on the document or account: ` +
          `${noEmail.map((identity) => identity.docId).join(', ')})`,
      )
    }
  }
}

main().catch((err) => {
  console.error('Backfill script failed:', err)
  process.exit(1)
})
