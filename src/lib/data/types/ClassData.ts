type ClassData = {
  classDay1: string
  classTime1: string
  classDay2: string
  classTime2: string
  meetingLink: string
  gradeRecommendation: string
  course: string
  meetingTimes: Date[]
  completedClassDates: Date[]
  feedbackCompleted: boolean[]
  classStatuses: string[]
  instructorFirstName: string
  instructorLastName: string
  instructorEmail: string
  // Absent on classes written before this field existed - callers must fall
  // back to instructorEmail rather than treat '' as "no owner". See
  // firestore.rules's isInstructorOfClass().
  instructorUid: string
  otherInstructorUids: string[]
  classCap: number
  students: string[]
  online: boolean
  id: string
}

export type { ClassData as default }
