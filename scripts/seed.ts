// seed.ts - CLI entry point for `yarn seed`, for manual/local emulator
// seeding. The actual seed data lives in scripts/seedLib.ts, which is also
// invoked in-process from a Cypress `seed` task (cypress.config.ts) so e2e
// runs seed via cy.task() rather than shelling out to this script.
import { seedEmulator } from './seedLib'

// Configure environment variables to point to the local Firebase emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.GCLOUD_PROJECT = 'demo-gbstem'

console.log('Connecting to Firebase emulators at:')
console.log(`- Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`)
console.log(`- Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`)
console.log(`- Project ID: ${process.env.GCLOUD_PROJECT}\n`)

seedEmulator().catch((err) => {
  console.error('Error seeding Firebase emulator database:', err)
  process.exit(1)
})
