import type {
  DocumentReference as ServerDocumentReference,
  Timestamp as ServerTimestamp,
} from 'firebase-admin/firestore'
import type {
  DocumentReference as ClientDocumentReference,
  Timestamp as ClientTimestamp,
} from 'firebase/firestore'
import type { User as ClientUser } from 'firebase/auth'

declare global {
  declare namespace Data {
    type Role = 'admin' | 'reviewer' | 'applicant'

    type Token<T extends 'client' | 'server' | 'pojo'> = {
      role: Role
      expires: T extends 'client'
      ? ClientTimestamp
      : T extends 'server'
      ? ServerTimestamp
      : Date
      consumable: boolean
      consumers: Array<string>
    }

    namespace User {
      type Peek = {
        uid: string
        email: string
        emailVerified: boolean
        role: Role
      }
      type Profile = {
        role: Role
      }
      type Store = {
        object: ClientUser
        profile: Profile
      }
    }

    type Resume = {
      url: string
      name: string
    }

    type Decision = 'accepted' | 'interview' | 'waitlisted' | 'rejected'

    type EmailData = {
      Subject: string,
      From: string,
      To: string,
      HTMLBody: string,
      ReplyTo: string,
      MessageStream: 'outbound'
    }

    type InterviewSlot = {
      date: string,
      id: string,
      interviewerName: string,
      intervieweeFirstName: string,
      intervieweeLastName: string,
      intervieweeEmail: string,
      intervieweeId: string,
      interviewerEmail: string,
      interviewSlotStatus: string,
      meetingLink: string,
    }

    type TimeRange = {
      start: number,
      end: number,
      timegap: number,
      date: Date,
      link: string,
    }

    type Registration<T extends 'client' | 'server' | 'pojo'> = {
      personal: {
        email: string
        studentFirstName: string
        studentLastName: string
        parentFirstName: string
        parentLastName: string
        secondaryEmail: string
        dateOfBirth: string
        gender: string
        race: string[]
        phoneNumber: string
        frlp: string
        parentEducation: string
      }
      academic: {
        school: string
        grade: string
      }
      program: {
        csCourse: string
        mathCourse: string
        engineeringCourse: string
        scienceCourse: string
        reason: string
        inPerson: boolean
      }
      agreements: {
        entireProgram: boolean
        timeCommitment: boolean
        submitting: boolean
        bypassAgeLimits:boolean
      }
      meta: {
        id: string
        uid: string
        submitted: boolean
      }
      timestamps: {
        created: T extends 'client'
        ? ClientTimestamp
        : T extends 'server'
        ? ServerTimestamp
        : Date
        updated: T extends 'client'
        ? ClientTimestamp
        : T extends 'server'
        ? ServerTimestamp
        : Date
      }
    }

    type InstructorFeedback = {
      instructorName: string
      studentName: string
      attendance: boolean
      date: string
      course: string
      feedback: string
    }

    type StudentFeedback = {
      instructorName: string
      studentName: string
      rating: number
      date: string
      course: string
      feedback: string
    }

    type Application<T extends 'client' | 'server' | 'pojo'> = {
      personal: {
        email: string
        firstName: string
        lastName: string
        dateOfBirth: string
        gender: string
        race: string[]
        phoneNumber: string
      }
      academic: {
        school: string
        graduationYear: string
      }
      program: {
        courses: string[]
        preferences: string
        numClasses: string
        timeSlots: string
        notAvailable: string
        inPerson: boolean
        reason: string
      }
      essay: {
        taughtBefore: boolean
        academicBackground: string
        teachingScenario: string
        why: string
      }
      agreements: {
        entireProgram: boolean
        timeCommitment: boolean
        submitting: boolean
      }
      meta: {
        id: string
        uid: string
        interview: boolean
        submitted: boolean
        decision:
        | (T extends 'client'
          ? ClientDocumentReference
          : T extends 'server'
          ? ServerDocumentReference
          : Decision)
        | null
      }
      timestamps: {
        created: T extends 'client'
        ? ClientTimestamp
        : T extends 'server'
        ? ServerTimestamp
        : Date
        updated: T extends 'client'
        ? ClientTimestamp
        : T extends 'server'
        ? ServerTimestamp
        : Date
      }
    }

    type User = {
      applicationType: string
      firstName: string
      id: string
      lastName: string
      role: string
    }

    type Announcement<T extends 'client' | 'server' | 'pojo'> = {
      title: string
      content: string
      timestamp: T extends 'client'
      ? ClientTimestamp
      : T extends 'server'
      ? ServerTimestamp
      : Date
    }
  }
}
