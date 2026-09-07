// set-user-role.ts - Sets one account's role, claim and document together.
//
// The escape hatch for accounts the bulk backfill deliberately will not touch.
// scripts/backfill-user-role-claims.ts repairs the one mismatch with a known
// cause (an `instructor` document under a `student` claim) and reports every
// other disagreement for a human, because a document naming a role the claim
// does not is not evidence the account should have it. This is how a human
// then acts on one.
//
// It writes *both* halves. Setting only the claim leaves the account diverged
// the other way and reported by every future backfill run; setting only the
// document changes nothing about what the account can do, since firestore.rules
// and every API gate read the claim.
//
// Usage:
//   npx tsx scripts/set-user-role.ts --email someone@example.com --role instructor --dry-run
//   npx tsx scripts/set-user-role.ts --email someone@example.com --role instructor
//   npx tsx scripts/set-user-role.ts --uid abc123 --role student --production --dry-run
//
// Flags:
//   --email / --uid   which account (exactly one)
//   --role            the new role
//   --dry-run         print the change without making it
//   --production      target production instead of the emulator
//   --force           required to grant admin or reviewer (see below)
//   --no-revoke       leave existing sessions alone
//
// Granting admin or reviewer needs --force on purpose. Those roles have only
// ever come from a signup token, which is auditable in the `tokens` collection
// and expires; handing one out from a shell is not. Prefer issuing a token.
//
// Refresh tokens are revoked by default, which signs the account out. That is
// the conservative choice for a single account: a role change reaches
// firestore.rules only when the ID token refreshes, so without it a demotion
// stays ineffective for up to an hour. The bulk backfill deliberately does the
// opposite - it would sign out well over a thousand people mid-application.
import admin from 'firebase-admin'
import { isKnownRole, KNOWN_ROLES } from './lib/userRoleClaimTransforms'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isProduction = args.includes('--production')
const isForced = args.includes('--force')
const skipRevoke = args.includes('--no-revoke')

function flagValue(name: string): string | undefined {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  const value = args[index + 1]
  return value && !value.startsWith('--') ? value : undefined
}

const email = flagValue('--email')
const uid = flagValue('--uid')
const role = flagValue('--role')

function usage(message: string): never {
  console.error(`${message}\n`)
  console.error(
    'Usage: npx tsx scripts/set-user-role.ts (--email <addr> | --uid <uid>) ' +
      `--role <${KNOWN_ROLES.join('|')}> [--dry-run] [--production] ` +
      '[--force] [--no-revoke]',
  )
  process.exit(1)
}

if (!email && !uid) usage('Pass --email or --uid to say which account.')
if (email && uid) usage('Pass only one of --email or --uid.')
if (!role) usage('Pass --role.')
if (!isKnownRole(role)) {
  usage(`"${role}" is not a role. Known roles: ${KNOWN_ROLES.join(', ')}.`)
}
if ((role === 'admin' || role === 'reviewer') && !isForced) {
  usage(
    `Refusing to grant "${role}" without --force. That role normally comes ` +
      'from a signup token, which is auditable and expires; issue one from ' +
      'the admin site instead unless you have a specific reason not to.',
  )
}

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

async function main() {
  const user = email
    ? await auth.getUserByEmail(email)
    : await auth.getUser(uid as string)

  const snap = await db.doc(`users/${user.uid}`).get()
  const beforeClaim =
    (user.customClaims?.role as string | undefined) ?? '(none)'
  const beforeDoc = snap.exists
    ? ((snap.data()?.role as string | undefined) ?? '(none)')
    : '(no document)'

  console.log(`Account:  ${user.uid}  ${user.email ?? '(no address)'}`)
  console.log(`  claim:    ${beforeClaim} -> ${role}`)
  console.log(`  document: ${beforeDoc} -> ${role}`)
  console.log(
    `  sessions: ${skipRevoke ? 'left alone' : 'revoked (the account is signed out)'}`,
  )

  if (beforeClaim === role && beforeDoc === role) {
    console.log('\nAlready set. Nothing to do.')
    return
  }

  if (isDryRun) {
    console.log('\nDRY RUN: nothing was written.')
    return
  }

  // Claim first: it is what actually authorizes, so if the second write fails
  // the account is left with the access it was meant to have rather than a
  // document promising access it does not have. Merged onto existing claims
  // so an unrelated one added later is not dropped.
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims ?? {}),
    role,
  })
  // merge:true because accounts predating the users collection have no
  // document, and the name fields must survive if they do.
  await db.doc(`users/${user.uid}`).set({ role }, { merge: true })

  if (!skipRevoke) {
    await auth.revokeRefreshTokens(user.uid)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  if (err?.code === 'auth/user-not-found') {
    console.error(`No account found for ${email ?? uid}.`)
    process.exit(1)
  }
  console.error('Failed:', err)
  process.exit(1)
})
