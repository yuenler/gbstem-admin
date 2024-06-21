import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_MEASUREMENT_ID,
} from '$env/static/public'

import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { readable } from 'svelte/store'

const config = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
  measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID,
}

initializeApp(config)
export const auth = getAuth()
export const db = getFirestore()
//FOR TESTING:
//export const db = getFirestore('gbstem-testing')
export const storage = getStorage()

function userStore() {
  const { subscribe } = readable<Data.User.Store | null | undefined>(
    undefined,
    (set) => {
      return onAuthStateChanged(auth, (userObject) => {
        if (userObject) {
          if (!userObject.emailVerified) {
            localStorage.setItem('emailVerified', 'false')
          }
          userObject.getIdTokenResult().then((idTokenResult) => {
            const { role } = idTokenResult.claims as { role: Data.Role }
            set({
              object: userObject,
              profile: {
                role,
              },
            })
          })
        } else {
          set(null)
        }
      })
    },
  )
  async function loaded() {
    return new Promise((resolve) => {
      const unsubscribe = subscribe((userData) => {
        if (userData !== undefined) {
          unsubscribe()
          resolve(true)
        }
      })
    })
  }
  return {
    subscribe,
    loaded,
  }
}

export const user = userStore()
