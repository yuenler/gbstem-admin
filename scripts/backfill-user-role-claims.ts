// backfill-user-role-claims.ts - Makes the Auth custom claim the single source
// of truth for a user's role, and audits for accounts where it already wasn't.
//
// Background: firestore.rules used to read the instructor role out of
// `users/{uid}.role`, a document its own owner could write. Anyone signed in
// could set `role: 'instructor'` on themselves and gain what that opened -
// most seriously, read access to every student registration for the semester.
// The rules now read the Auth custom claim instead, which only the Admin SDK
// can set.
//
// That switch is safe only if every account that should have a role actually
// carries the claim. Accounts created before portal's /api/auth started
// back-filling claims have a document role and no claim; under the new rules
// they would silently lose access. This script finds them and sets the claim
// from the document.
//
// It also repairs a second, larger population. 521 accounts carry an
// `instructor` document under a `student` claim - a bug from an earlier era of
// claim handling, not tampering (the first production run found 521 of 522
// mismatches were this identical pair, including directors and a sitting
// co-president; a self-promoting attacker population would be small and
// varied). Those accounts are already broken today: portal's UI reads the role
// from the document, so they see instructor pages, while `verifyInstructor`
// reads the claim, so every instructor API route refuses them. Repairing the
// claim fixes that, and is what stops the new rules from taking instructor
// access away from 521 real instructors on deploy day.
//
// Every *other* disagreement is reported and deliberately left alone - notably
// a document naming `admin` or `reviewer` under a lesser claim, where writing
// the document's value would grant privilege rather than restore it. Run the
// dry pass first and read that section before running for real.
//
// Usage:
//   npx tsx scripts/backfill-user-role-claims.ts --dry-run
//   npx tsx scripts/backfill-user-role-claims.ts
//   npx tsx scripts/backfill-user-role-claims.ts --dry-run --production
//   npx tsx scripts/backfill-user-role-claims.ts --production
//
// Idempotent: only accounts missing a claim are written, so a second run after
// a partial failure is safe, and a clean second run is the check that the
// first one finished.
//
// Deploy order matters. Run this (for real) BEFORE deploying the new rules,
// then wait at least an hour before the rules go out: a claim reaches
// request.auth.token only when the ID token refreshes, and tokens live an
// hour. Waiting lets every signed-in client pick the claim up on its own,
// which is gentler than revokeRefreshTokens() - that would also invalidate
// session cookies (hooks.server.ts verifies with checkRevoked) and sign people
// out mid-application.
import admin from 'firebase-admin'
import {
  classifyAccount,
  needsAttention,
  roleToWrite,
  type Verdict,
} from './lib/userRoleClaimTransforms'

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

const AUTH_PAGE_SIZE = 1000 // listUsers() maximum

type Row = { uid: string; email: string; verdict: Verdict }

async function main() {
  console.log(
    isDryRun
      ? 'DRY RUN: no claims will be written.\n'
      : 'Writing missing role claims.\n',
  )

  const rows: Row[] = []
  let pageToken: string | undefined

  do {
    const page = await auth.listUsers(AUTH_PAGE_SIZE, pageToken)
    // One Firestore read per account. listUsers caps at 1000 per page, which
    // is well under getAll()'s limits, so the whole page is fetched at once
    // rather than one document at a time.
    const snaps = page.users.length
      ? await db.getAll(
          ...page.users.map((user) => db.doc(`users/${user.uid}`)),
        )
      : []

    page.users.forEach((user, index) => {
      const snap = snaps[index]
      rows.push({
        uid: user.uid,
        email: user.email ?? '(no address)',
        verdict: classifyAccount({
          uid: user.uid,
          email: user.email,
          claimRole: user.customClaims?.role,
          docRole: snap?.exists ? snap.data()?.role : undefined,
        }),
      })
    })

    pageToken = page.pageToken
  } while (pageToken)

  const byKind = (kind: Verdict['kind']) =>
    rows.filter((row) => row.verdict.kind === kind)

  console.log(`Scanned ${rows.length} account(s).\n`)

  // The audit half. Printed first, and before anything is written, because it
  // is the part that wants a human.
  const divergent = byKind('divergent')
  if (divergent.length) {
    console.log(
      `!! ${divergent.length} account(s) whose claim and users document disagree in a\n` +
        '   way this script will not repair. A document naming a role the claim does\n' +
        '   not is not evidence the account should have it - admin and reviewer have\n' +
        '   only ever come from a signup token, so writing the document value would\n' +
        '   grant privilege rather than restore it. Decide these by hand.\n',
    )
    for (const row of divergent) {
      const v = row.verdict as Extract<Verdict, { kind: 'divergent' }>
      console.log(
        `   ${row.uid}  ${row.email}  claim=${v.claimRole}  document=${v.docRole}`,
      )
    }
    console.log('')
  }

  const unknown = byKind('unknown-role')
  if (unknown.length) {
    console.log(
      `!! ${unknown.length} account(s) carrying a role neither site recognises:\n`,
    )
    for (const row of unknown) {
      const v = row.verdict as Extract<Verdict, { kind: 'unknown-role' }>
      console.log(`   ${row.uid}  ${row.email}  ${v.where}=${v.role}`)
    }
    console.log('')
  }

  const orphans = byKind('orphan')
  const claimOnly = byKind('claim-only')
  if (orphans.length) {
    console.log(
      `   ${orphans.length} account(s) with no role at all - they cannot sign in to ` +
        'either site. Usually an abandoned signup.',
    )
  }
  if (claimOnly.length) {
    console.log(
      `   ${claimOnly.length} account(s) with a claim but no users document. ` +
        'Authorization is unaffected; names will be missing.',
    )
  }
  console.log(`   ${byKind('ok').length} account(s) already consistent.\n`)

  // The write half: claims that are missing, plus the instructor/student pair
  // that has a known cause and a known repair. Counted separately because they
  // mean different things - one is filling a gap, the other is overwriting a
  // wrong value - and because the second is the one worth eyeballing in a dry
  // run before it goes out.
  const backfills = byKind('backfill')
  const reconciles = byKind('reconcile')
  const pending = [...backfills, ...reconciles]

  if (reconciles.length) {
    console.log(
      `   ${reconciles.length} account(s) hold an instructor document under a student\n` +
        '   claim. Portal shows them instructor pages while every instructor API route\n' +
        '   refuses them, so these are already broken; the claim is repaired below.\n',
    )
  }

  if (!pending.length) {
    console.log('No claims need setting.')
  } else if (isDryRun) {
    console.log(
      `Would set the role claim on ${pending.length} account(s) ` +
        `(${backfills.length} missing, ${reconciles.length} student -> instructor):\n`,
    )
    for (const row of pending) {
      const role = roleToWrite(row.verdict)
      const note = row.verdict.kind === 'reconcile' ? '  (was student)' : ''
      console.log(`   ${row.uid}  ${row.email}  -> ${role}${note}`)
    }
  } else {
    console.log(
      `Setting the role claim on ${pending.length} account(s) ` +
        `(${backfills.length} missing, ${reconciles.length} student -> instructor)...`,
    )
    let written = 0
    let failed = 0
    for (const row of pending) {
      const role = roleToWrite(row.verdict)
      if (!role) continue
      try {
        // Merged onto whatever claims the account already carries rather than
        // replacing them, so an unrelated claim added later is not dropped.
        const existing = (await auth.getUser(row.uid)).customClaims ?? {}
        await auth.setCustomUserClaims(row.uid, { ...existing, role })
        written += 1
      } catch (err) {
        failed += 1
        console.error(`   FAILED ${row.uid} (${row.email}):`, err)
      }
    }
    console.log(`Set ${written} claim(s), ${failed} failure(s).`)
  }

  const attention = rows.filter((row) => needsAttention(row.verdict)).length
  if (attention) {
    console.log(
      `\nDone, but ${attention} account(s) above need a look before the new ` +
        'rules are deployed.',
    )
    // A non-zero exit so a scripted run can't quietly skip the audit.
    process.exitCode = 1
  } else {
    console.log('\nDone. Nothing anomalous found.')
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
