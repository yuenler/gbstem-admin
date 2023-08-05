import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} from '$env/static/private'
import firebase from 'firebase-admin'

try {
  firebase.initializeApp({
    credential: firebase.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  })
  //  eslint-disable-next-line @typescript-eslint/no-explicit-any
} catch (err: any) {
  if (!/already exists/u.test(err.message)) {
    console.log('Firebase Admin Error:', err.stack)
  }
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()
