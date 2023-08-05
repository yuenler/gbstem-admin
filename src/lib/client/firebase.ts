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
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import {
  FieldValue,
  Timestamp,
  doc,
  getDoc,
  getFirestore,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { readable } from 'svelte/store'

export type UserProfile = {
  firstName: string
  lastName: string
  hhid: `HH-${number}`
  role: 'applicant' | 'admin'
}

export type UserPeek = {
  emailVerified: boolean
}

export type UserData = {
  object: User
  profile: UserProfile
}

export type ResumeData = {
  url: string
  name: string
}

export type ApplicationData = {
  personal: {
    email: string
    firstName: string
    lastName: string
    age: string
    gender: string
    race: string[]
    underrepresented: string
    phoneNumber: string
    countryOfResidence: string
    shippingAddress: string
    shippingCity: string
    shippingState: string
    shippingCountry: string
    shippingZipCode: string
    dietaryRestrictions: string[]
  }
  academic: {
    enrolled: boolean
    currentSchool: string
    graduationYear: string
    major: string
    affiliated: boolean
    levelOfStudy: string
  }
  hackathon: {
    shirtSize: string
    firstHackathon: boolean
    previouslyParticipated: boolean
    ableToAttend: boolean
    reason: string
  }
  openResponse: {
    roles: string[]
    otherRole: string
    prolangs: string[]
    otherProlang: string
    experience: string
    whyHh: string
    project: string
    predictions: string
    resume: ResumeData
    resumeShare: boolean
  }
  agreements: {
    codeOfConduct: boolean
    sharing: boolean
    mlhEmails: boolean
    submitting: boolean
  }
  meta: {
    hhid: string
    uid: string
    submitted: boolean
    decision: 'accepted' | 'waitlisted' | 'rejected' | null
  }
  timestamps: {
    created: FieldValue
    updated: FieldValue
  }
}

export type AnnouncementData = {
  title: string
  content: string
  timestamp: Timestamp
}

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
export const storage = getStorage()

function userStore() {
  const { subscribe } = readable<UserData | null | undefined>(
    undefined,
    (set) => {
      return onAuthStateChanged(auth, (userObject) => {
        if (userObject) {
          if (!userObject.emailVerified) {
            localStorage.setItem('emailVerified', 'false')
          }
          getDoc(doc(db, 'users', userObject.uid)).then(async (res) => {
            const userProfile = res.data()
            set({
              object: userObject,
              profile: userProfile as UserProfile,
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
