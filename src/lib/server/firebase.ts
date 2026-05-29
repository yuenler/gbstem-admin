import { building } from '$app/environment'
import {
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
} from '$env/static/private'
import firebase from 'firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export let adminAuth: any
export let adminDb: any

if (!building) {
  try {
    firebase.initializeApp({
      credential: firebase.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
      }),
    })

  } catch (err: any) {
    if (!/already exists/u.test(err.message)) {
      console.log('Firebase Admin Error:', err.stack)
    }
  }
  adminAuth = getAuth()
  adminDb = getFirestore()
} else {
  adminAuth = {}
  adminDb = {}
}

export function verifyToken(token: string) {
  return new Promise<Data.Token<'server'>>((resolve, reject) => {
    adminDb
      .collection('tokens')
      .doc(token)
      .get()
      .then((tokenDoc) => {
        if (tokenDoc.exists) {
          const tokenData = tokenDoc.data() as Data.Token<'server'>
          if (tokenData.expires.toDate() > new Date()) {
            // even if `consumable`, allows for 2 consumers as race condition
            // it's alright though
            if (tokenData.consumable && tokenData.consumers.length >= 1) {
              reject('consumed')
            } else {
              resolve(tokenData)
            }
          } else {
            reject('expired')
          }
        } else {
          reject('fake')
        }
      })
      .catch(() => reject('unknown'))
  })
}
