import { db } from '$lib/client/firebase'
import {
  applicationsCollection,
  classesCollection,
  registrationsCollection,
} from '$lib/data/collections'
import { timestampToDate } from '$lib/utils'
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

export interface DashboardData {
  applications: {
    total: number
    submitted: number
    decided: number
    registered: number
    totalRegistrationsStarted: number
    enrolled: number
  }
  users: {
    total: number
  }
}

export interface ClassToday {
  id: string
  classNumber: number
  class: Data.Class
}

export interface DashboardLoadResult {
  dashboardData: DashboardData
  classesToday: ClassToday[]
  uncompletedRegistrationsEmails: string[]
  uncompletedApplicationsEmails: string[]
}

const DEFAULT_TIMEOUT_MS = 10000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout (${timeoutMs / 1000} seconds)`))
    }, timeoutMs)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

function extractEmail(docSnap: any): string | null {
  const email = docSnap.data().personal?.email
  return typeof email === 'string' ? email : null
}

/**
 * Service providing Data Access Layer for the Admin Dashboard's aggregated stats.
 */
export const dashboardService = {
  /**
   * Fetches dashboard stats scoped to a reviewer or full-admin view. Rejects
   * if the underlying queries don't settle within `timeoutMs`.
   */
  async fetchDashboardData(
    reviewer: boolean,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<DashboardLoadResult> {
    const applicationsColl = collection(db, applicationsCollection)

    if (reviewer) {
      const [uncompletedApplicationsSnapshot, counts] = await withTimeout(
        Promise.all([
          getDocs(
            query(applicationsColl, where('meta.submitted', '==', false)),
          ),
          Promise.all([
            getCountFromServer(applicationsColl),
            getCountFromServer(
              query(applicationsColl, where('meta.submitted', '==', true)),
            ),
            getCountFromServer(
              query(applicationsColl, where('meta.decision', '!=', null)),
            ),
          ]),
        ]),
        timeoutMs,
      )

      const appEmails: string[] = []
      uncompletedApplicationsSnapshot.forEach((docSnap: any) => {
        const email = extractEmail(docSnap)
        if (email) appEmails.push(email)
      })

      const [
        totalApplicationsSnapshot,
        submittedApplicationsSnapshot,
        decidedApplicationsSnapshot,
      ] = counts

      return {
        dashboardData: {
          applications: {
            total: totalApplicationsSnapshot.data().count,
            submitted: submittedApplicationsSnapshot.data().count,
            decided: decidedApplicationsSnapshot.data().count,
            registered: 0,
            totalRegistrationsStarted: 0,
            enrolled: 0,
          },
          users: { total: 0 },
        },
        classesToday: [],
        uncompletedRegistrationsEmails: [],
        uncompletedApplicationsEmails: appEmails,
      }
    }

    const usersColl = collection(db, 'users')
    const registrationsColl = collection(db, registrationsCollection)
    const classesColl = collection(db, classesCollection)

    const [
      uncompletedRegistrationsSnapshot,
      uncompletedApplicationsSnapshot,
      submittedRegistrationsSnapshot,
      counts,
      classesSnapshot,
    ] = await withTimeout(
      Promise.all([
        getDocs(query(registrationsColl, where('meta.submitted', '==', false))),
        getDocs(query(applicationsColl, where('meta.submitted', '==', false))),
        getDocs(query(registrationsColl, where('meta.submitted', '==', true))),
        Promise.all([
          getCountFromServer(applicationsColl),
          getCountFromServer(
            query(applicationsColl, where('meta.submitted', '==', true)),
          ),
          getCountFromServer(
            query(applicationsColl, where('meta.decision', '!=', null)),
          ),
          getCountFromServer(usersColl),
          getCountFromServer(registrationsColl),
          getCountFromServer(
            query(registrationsColl, where('enrolled', '==', true)),
          ),
        ]),
        getDocs(query(classesColl)),
      ]),
      timeoutMs,
    )

    // Process submitted registration emails for filtering
    const submittedRegEmails = new Set<string>()
    submittedRegistrationsSnapshot.forEach((docSnap: any) => {
      const email = extractEmail(docSnap)
      if (email) submittedRegEmails.add(email.trim().toLowerCase())
    })

    // Process uncompleted registration emails (exclude users with an already submitted registration)
    const regEmailsSet = new Set<string>()
    uncompletedRegistrationsSnapshot.forEach((docSnap: any) => {
      const email = extractEmail(docSnap)
      if (email) {
        const clean = email.trim()
        if (clean && !submittedRegEmails.has(clean.toLowerCase())) {
          regEmailsSet.add(clean)
        }
      }
    })

    // Process uncompleted application emails
    const appEmailsSet = new Set<string>()
    uncompletedApplicationsSnapshot.forEach((docSnap: any) => {
      const email = extractEmail(docSnap)
      if (email) {
        const clean = email.trim()
        if (clean) appEmailsSet.add(clean)
      }
    })

    const [
      totalApplicationsSnapshot,
      submittedApplicationsSnapshot,
      decidedApplicationsSnapshot,
      totalUsersSnapshot,
      totalRegistrationsSnapshot,
      enrolledRegistrationsSnapshot,
    ] = counts

    // Process classes today
    const todayClasses: ClassToday[] = []
    classesSnapshot.forEach((docSnap: any) => {
      const meetingTimes = docSnap.data().meetingTimes
      if (meetingTimes !== undefined && Array.isArray(meetingTimes)) {
        for (let i = 0; i < meetingTimes.length; i++) {
          const rawTime = meetingTimes[i]
          if (rawTime) {
            const meetingTime = timestampToDate(rawTime)
            if (
              meetingTime &&
              new Date().toLocaleDateString() ===
                meetingTime.toLocaleDateString()
            ) {
              const classSession = docSnap.data() as Data.Class
              todayClasses.push({
                id: docSnap.id,
                class: classSession,
                classNumber: i,
              })
            }
          }
        }
      }
    })

    return {
      dashboardData: {
        applications: {
          total: totalApplicationsSnapshot.data().count,
          submitted: submittedApplicationsSnapshot.data().count,
          decided: decidedApplicationsSnapshot.data().count,
          registered: submittedRegistrationsSnapshot.size,
          totalRegistrationsStarted: totalRegistrationsSnapshot.data().count,
          enrolled: enrolledRegistrationsSnapshot.data().count,
        },
        users: { total: totalUsersSnapshot.data().count },
      },
      classesToday: todayClasses,
      uncompletedRegistrationsEmails: Array.from(regEmailsSet),
      uncompletedApplicationsEmails: Array.from(appEmailsSet),
    }
  },
}
