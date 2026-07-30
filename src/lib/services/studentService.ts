import { db } from '$lib/client/firebase'
import {
  classesCollection,
  instructorFeedbackCollection,
  registrationsCollection,
} from '$lib/data/collections'
import type ClassData from '$lib/data/types/ClassData'
import type Student from '$lib/data/types/Student'
import {
  buildEnrollApiPayload,
  parseAttendanceRecords,
  parseStudentProfileData,
} from '$lib/helpers/studentDetails'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

/**
 * Service providing Data Access Layer for student details, class enrollment, and attendance.
 */
export const studentService = {
  /**
   * Fetches full student details including confirmations, HHID check-in status, classes, and attendance.
   */
  async fetchStudentFullDetails(studentId: string) {
    // Start fetching everything in parallel to optimize load times and prevent timeout
    const studentDocRef = doc(db, registrationsCollection, studentId)
    const studentPromise = getDoc(studentDocRef)
    const hhidPromise = getDoc(doc(db, 'hhids', studentId)).catch((err) => {
      console.warn(
        'Failed to fetch hhid details (possible permission issue):',
        err,
      )
      return null
    })
    const classesPromise = getDocs(query(collection(db, classesCollection)))
    const attendancePromise = getDocs(
      query(collection(db, instructorFeedbackCollection)),
    ).catch((err) => {
      console.warn(
        'Failed to fetch feedback details (possible permission issue):',
        err,
      )
      return null
    })

    // Wait for the primary student data first
    const studentDoc = await studentPromise
    let confirmedPromise: Promise<any> | null = null
    let studentData: Student | null = null

    if (studentDoc.exists()) {
      const data = studentDoc.data()
      if (data) {
        studentData = parseStudentProfileData(data)
        if (data.meta?.uid) {
          confirmedPromise = getDoc(
            doc(db, 'confirmations', data.meta.uid),
          ).catch((err) => {
            console.warn(
              'Failed to fetch confirmation details (possible permission issue):',
              err,
            )
            return null
          })
        }
      }
    }

    // Wait for all other parallel promises
    const [confirmedDoc, hhidDoc, classesSnap, attendanceSnap] =
      await Promise.all([
        confirmedPromise || Promise.resolve(null),
        hhidPromise,
        classesPromise,
        attendancePromise,
      ])

    // Process check-in and confirmation details
    let confirmed = false
    let checkedIn = false
    let checkedInAt: Date | null = null
    let food: Record<string, Record<string, boolean>> = {}

    if (confirmedDoc && confirmedDoc.exists()) {
      confirmed = confirmedDoc.exists()
    }

    if (hhidDoc && hhidDoc.exists()) {
      const hhidData = hhidDoc.data()
      if (hhidData) {
        checkedIn = hhidData.checkedIn
        checkedInAt = hhidData.checkedInAt?.toDate
          ? hhidData.checkedInAt.toDate()
          : hhidData.checkedInAt
        food = hhidData.food || {}
      }
    }

    // Process classes
    const enrolledClasses: ClassData[] = []
    const unenrolledClasses: ClassData[] = []

    if (classesSnap) {
      classesSnap.forEach((docSnap) => {
        const data = docSnap.data() as ClassData
        if (data) {
          data.id = docSnap.id
          if (data.students?.includes(studentId)) {
            enrolledClasses.push(data)
          } else {
            unenrolledClasses.push(data)
          }
        }
      })
    }

    // Process attendance
    const attendance = attendanceSnap
      ? parseAttendanceRecords(attendanceSnap.docs)
      : []

    return {
      studentData,
      studentID: studentDoc.id,
      confirmed,
      checkedIn,
      checkedInAt,
      food,
      enrolledClasses,
      unenrolledClasses,
      attendance,
    }
  },

  /**
   * Fetches student profile details from registrationsCollection.
   */
  async fetchStudentProfile(studentId: string): Promise<Student | null> {
    const docRef = doc(db, registrationsCollection, studentId)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return parseStudentProfileData(snap.data())
    }
    return null
  },

  /**
   * Fetches all classes and builds a mapping from student UID to array of enrolled course names.
   */
  async fetchStudentCoursesMap(): Promise<Map<string, string[]>> {
    const q = query(collection(db, classesCollection))
    const snapshot = await getDocs(q)
    const map = new Map<string, string[]>()
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as ClassData
      const course = data.course
      const students: string[] = data.students || []
      for (const studentId of students) {
        if (!map.has(studentId)) map.set(studentId, [])
        map.get(studentId)!.push(course)
      }
    }
    return map
  },

  /**
   * Fetches all class offerings.
   */
  async fetchAllClasses(): Promise<{
    classes: ClassData[]
    nameToUid: Record<string, string>
  }> {
    const q = query(collection(db, classesCollection))
    const querySnapshot = await getDocs(q)
    const classes: ClassData[] = []
    const nameToUid: Record<string, string> = {}

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as ClassData
      classes.push(data)
      nameToUid[
        `${data.course} (${data.instructorFirstName} ${data.instructorLastName})`
      ] = docSnap.id
    })

    return { classes, nameToUid }
  },

  /**
   * Fetches attendance records for a student.
   */
  async fetchStudentAttendance(
    studentId: string,
  ): Promise<ClientInstructorFeedback[]> {
    const q = query(collection(db, instructorFeedbackCollection))
    const querySnapshot = await getDocs(q)
    const records = querySnapshot.docs.map((d) => d.data())
    return parseAttendanceRecords(records)
  },

  /**
   * Enrolls a student into a class and triggers enrollment email API.
   */
  async enrollStudent(
    studentData: Student,
    selectedClass: ClassData,
    studentId: string,
  ): Promise<void> {
    const classDocRef = doc(db, classesCollection, selectedClass.id)
    await updateDoc(classDocRef, {
      students: arrayUnion(studentId),
    })

    const registrationDocRef = doc(db, registrationsCollection, studentId)
    await updateDoc(registrationDocRef, {
      classes: arrayUnion(selectedClass.id),
      enrolled: true,
    })

    const payload = buildEnrollApiPayload(studentData, selectedClass)
    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error('Failed to send enrollment email notification')
    }
  },

  /**
   * Drops a student from a class and updates registration status.
   */
  async dropStudentFromClass(
    classId: string,
    studentId: string,
  ): Promise<void> {
    const classDocRef = doc(db, classesCollection, classId)
    await updateDoc(classDocRef, {
      students: arrayRemove(studentId),
    })

    const registrationDocRef = doc(db, registrationsCollection, studentId)
    await updateDoc(registrationDocRef, { classes: arrayRemove(classId) })
    const regSnap = await getDoc(registrationDocRef)
    const remainingClasses = (regSnap?.data?.()?.classes || []) as string[]
    await updateDoc(registrationDocRef, {
      enrolled: remainingClasses.length > 0,
    })
  },

  /**
   * Marks a student as checked-in in hhids collection.
   */
  async checkInStudent(studentId: string, now: Date): Promise<void> {
    const hhidRef = doc(db, 'hhids', studentId)
    await setDoc(
      hhidRef,
      {
        checkedIn: true,
        checkedInAt: now,
        food: {
          '2023-10-20': { dinner: false },
          '2023-10-21': { breakfast: false, lunch: false, dinner: false },
          '2023-10-22': { breakfast: false },
        },
      },
      { merge: true },
    )
  },

  /**
   * Updates meal preferences in hhids collection.
   */
  async updateStudentMeal(
    studentId: string,
    date: string,
    meal: string,
    newState: boolean,
  ): Promise<void> {
    const hhidRef = doc(db, 'hhids', studentId)
    await updateDoc(hhidRef, {
      [`food.${date}.${meal}`]: newState,
    })
  },
}
