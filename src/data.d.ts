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

    type Decision = 'accepted' | 'interview' | 'waitlisted' | 'rejected' | 'substitute'

    type Interview = {
      date: string,
      interviewer: string,
      notes: string,
      type: Decision,
      likelyDecision: 'likely yes' | 'likely no' | 'likely waitlist' | null,
      attendance: 'On Time' | 'Late' | 'No-Show' | 'Null',
      conversation: number,
      conversationNotes: string,
      lastSemesterNotes: string,
      mockLessonExplanations: number,
      mockLessonEngagement: number,
      mockLessonPace: number,
      mockLessonOverall: number,
      mockLessonNotes: string,
      teachingPreferences: string,
      availabilityNotes: string,
    }

    type EmailData = {
      Subject: string,
      From: string,
      To: string,
      Cc: string,
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

    type SlotRequest = {
      date: Date,
      id: string,
      firstName: string,
      lastName: string,
      email: string,
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
      inPerson: {
        allergies: string
        parentPickup: string
      }
      agreements: {
        entireProgram: boolean
        timeCommitment: boolean
        submitting: boolean
        mediaRelease: boolean
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
      students: string[]
      attendanceList: boolean[]
      date: string
      courseName: string
      feedback: string
      classNumber: number
      id: string
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

    type Class = {
      classCap: number
      classDay1: string
      classDay2: string
      classTime1: string
      classTime2: string
      course: string
      instructorEmail: string
      otherInstructorEmails: string
      instructorFirstName: string
      instructorLastName: string
      meetingLink: string
      meetingTimes: Date[]
      completedClassDates: Date[]
      classStatuses: string[]
      feedbackCompleted: boolean[]
      online: boolean
      students: string[]
    }

    type SubRequest = {
      id: string
      classNumber: number
      course: string
      dateOfClass: Date
      originalInstructorEmail: string
      subInstructorId: string
      subInstructorFirstName: string
      subInstructorEmail: string
      subRequestStatus: SubRequestStatus
      link: string
      notes: string
    }
  }
}
