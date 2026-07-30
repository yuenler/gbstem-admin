import { db } from '$lib/client/firebase'
import {
  classesCollection,
  registrationsCollection,
} from '$lib/data/collections'
import type ClassData from '$lib/data/types/ClassData'
import type Student from '$lib/data/types/Student'
import { normalizeCapitals, timestampToDate } from '$lib/utils'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

/**
 * Service providing Data Access Layer for Admin Class operations.
 */
export const classService = {
  /**
   * Fetches a single class document by ID and normalizes meeting times.
   */
  async fetchClassData(classId: string): Promise<ClassData | null> {
    const snap = await getDoc(doc(db, classesCollection, classId))
    if (!snap.exists()) {
      return null
    }

    const data = snap.data() as ClassData
    data.meetingTimes = (data.meetingTimes || [])
      .map((t) => timestampToDate(t))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())

    return data
  },

  /**
   * Updates classStatuses for a given class document.
   */
  async updateClassStatuses(
    classId: string,
    classStatuses: string[],
  ): Promise<void> {
    const classRef = doc(db, classesCollection, classId)
    await updateDoc(classRef, { classStatuses })
  },

  /**
   * Fetches student profile records for a list of student UIDs.
   */
  async fetchStudentList(studentUids: string[]): Promise<Student[]> {
    const docs = await Promise.all(
      studentUids.map((uid) => getDoc(doc(db, registrationsCollection, uid))),
    )
    const list: Student[] = []
    docs.forEach((studentDoc) => {
      if (studentDoc.exists()) {
        const data = studentDoc.data()
        if (data) {
          list.push({
            name: `${normalizeCapitals(
              data.personal.studentFirstName +
                ' ' +
                data.personal.studentLastName,
            )}`,
            email: data.personal.email,
            secondaryEmail: data.personal.secondaryEmail || '',
            phone: data.personal.phoneNumber || '',
            grade: data.academic?.grade || '',
            school: data.academic?.school || '',
          })
        }
      }
    })
    return list
  },
}
