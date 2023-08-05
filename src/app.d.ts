// See https://kit.svelte.dev/docs/types#app

import type { UserPeek } from '$lib/client/firebase'

// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: UserPeek | null
    }
    // interface PageData {}
    // interface Platform {}
  }
}

export {}
