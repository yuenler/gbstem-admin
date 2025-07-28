<script lang="ts">
  import {
    doc,
    getDoc,
    updateDoc,
    query,
    getDocs,
    collection,
    arrayUnion,
    arrayRemove,
  } from 'firebase/firestore'
  import Input from '$lib/components/Input.svelte'
  import Select from '$lib/components/Select.svelte'
  import Card from '$lib/components/Card.svelte'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import { alert } from '$lib/stores'
  import { tick, onMount } from 'svelte'
  import { copyEmails, formatClassTimes, getNearestFutureClass } from '$lib/utils'
  import { classesCollection, instructorFeedbackCollection, registrationsCollection } from '$lib/data/collections'
  import type ClassData from '$lib/data/types/ClassData'
  import type Student from '$lib/data/types/Student'
  import sendClassReminder from '$lib/data/helpers/sendClassReminders'
  import { db } from '$lib/client/firebase'

  export let dialogEl: Dialog
  export let id: string | undefined

  let studentID = ''
  let loading = true
  let studentData: Student = {
    name: '',
    email: '',
    secondaryEmail: '',
    phone: '',
    grade: 0,
    school: '',
    parentName: '',
  }
  let attendance: Data.InstructorFeedback[] = []
  let classes: ClassData[] = []
  let classesOptions: { name: string }[] = []
  let dropClassesOptions: { name: string }[] = []
  let selectedClass = ''
  let selectedClassId = ''
  let selectedDropClass = ''
  let selectedDropClassId = ''
  const nameToUid: Record<string, string> = {}

  // Load student classes and info
  async function loadStudentClasses(studentId: string) {
    classes = []
    classesOptions = []
    dropClassesOptions = []
    attendance = []

    // Get student registration info
    const studentDocRef = doc(db, registrationsCollection, studentId)
    const studentDoc = await getDoc(studentDocRef)
    if (studentDoc.exists()) {
      const data = studentDoc.data()
      if (data) {
        studentData = {
          name: `${data.personal.studentFirstName} ${data.personal.studentLastName}`,
          email: data.personal.email,
          secondaryEmail: data.personal.secondaryEmail,
          phone: data.personal.phoneNumber,
          grade: data.academic.grade,
          school: data.academic.school,
          parentName: `${data.personal.parentFirstName} ${data.personal.parentLastName}`,
        }
        studentID = studentDoc.id
      }
    }

    // Get attendance
    const attendanceSnap = await getDocs(query(collection(db, instructorFeedbackCollection)))
    attendance = []
    attendanceSnap.forEach((doc) => {
      const data = doc.data()
      if (data) {
        attendance.push({
          courseName: data.courseName,
          date: data.date,
          attendanceList: data.attendanceList,
          feedback: data.feedback,
          id: doc.id,
          classNumber: data.classNumber,
          instructorName: data.instructorName,
          students: data.students,
        })
      }
    })
    attendance.sort((a, b) => a.classNumber - b.classNumber)

    // Get classes
    const classesSnap = await getDocs(query(collection(db, classesCollection)))
    classes = []
    classesOptions = []
    dropClassesOptions = []
    classesSnap.forEach((doc) => {
      const data = doc.data() as ClassData
      if (data) {
        data.id = doc.id
        const name = `${data.course} taught by ${data.instructorFirstName} ${data.instructorLastName} at ${data.classTime1} ${data.classDay1} and ${data.classTime2} ${data.classDay2}`.trim()
        nameToUid[name] = data.id
        classesOptions.push({ name })
        if (data.students.includes(studentId)) {
          classes.push(data)
          dropClassesOptions.push({ name })
        }
      }
    })
  }

  // // Watch for id changes and reload
  // $: if (id) {
  //   loading = true
  //   loadStudentClasses(id).then(() => loading = false)
  // }

  // Update selected class IDs
  $: {
    const selectedClassOption = classesOptions.find(opt => opt.name === selectedClass)
    selectedClassId = selectedClassOption ? nameToUid[selectedClassOption.name] : ''
    const selectedDropClassOption = dropClassesOptions.find(opt => opt.name === selectedDropClass)
    selectedDropClassId = selectedDropClassOption ? nameToUid[selectedDropClassOption.name] : ''
    if(selectedDropClassOption) {
      console.log(nameToUid[selectedDropClassOption.name])
    }
    if(selectedClassOption) {
      console.log(nameToUid[selectedClassOption.name])
    }
  }

  // Add class
  async function addClass(classId: string) {
    if (!studentID || !classId) {
      alert.trigger('error', 'Student ID or class is missing.')
      return
    }
    try {
      const classDocRef = doc(db, classesCollection, classId)
      const registrationDocRef = doc(db, registrationsCollection, studentID)
      const classDocSnap = await getDoc(classDocRef)
      const classSelected = classDocSnap.data() as ClassData
      if (!classSelected) {
        alert.trigger('error', 'Class not found.')
        return
      }
      await updateDoc(classDocRef, { students: arrayUnion(studentID) })
      await updateDoc(registrationDocRef, { classes: arrayUnion(classId) })
      alert.trigger('success', 'Enrolled in class successfully!')
      selectedClass = ''
      selectedClassId = ''
      await tick()
      await loadStudentClasses(studentID)
      await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentData.email,
          firstName: studentData.parentName.split(' ')[0],
          instructor: `${classSelected.instructorFirstName} ${classSelected.instructorLastName}`,
          instructorEmail: classSelected.instructorEmail,
          classTimes: [classSelected.classTime1, classSelected.classTime2],
          classDays: [classSelected.classDay1, classSelected.classDay2],
          course: classSelected.course,
          meetingLink: classSelected.meetingLink,
          online: classSelected.online,
          studentName: studentData.name,
        }),
      })
      dialogEl.close()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Error adding class:', error)
      alert.trigger('error', 'Failed to add class.')
    }
  }

  // Drop class
  async function dropClass(classId: string) {
    console.log(studentID)
    if (!studentID || !classId) {
      alert.trigger('error', 'Student ID or class is missing.')
      return
    }
    try {
      const classDocRef = doc(db, classesCollection, classId)
      const registrationDocRef = doc(db, registrationsCollection, studentID)
      await updateDoc(classDocRef, { students: arrayRemove(studentID) })
      await updateDoc(registrationDocRef, { classes: arrayRemove(classId) })
      alert.trigger('success', 'Dropped class successfully!')
      selectedDropClass = ''
      selectedDropClassId = ''
      await tick()
      await loadStudentClasses(studentID)
    } catch (error) {
      console.error('Error dropping class:', error)
      alert.trigger('error', 'Failed to drop class.')
    }
  }
</script>

<Dialog bind:this={dialogEl} size="full" alert on:open={() => { if (id) { loading = true; loadStudentClasses(id).then(() => loading = false) } }}>
  <svelte:fragment slot="title">
    <div class="flex justify-between">
      <div>Student Attendance and Information</div>
      <Button color="red" on:click={() => { loading = true; id = undefined; dialogEl.cancel() }}>Close</Button>
    </div>
  </svelte:fragment>
  <div slot="description">
    <div class="mt-4 justify-center">
      {#each classes as value, i}
        <Card>
          <div class="flex justify-between">
            <h2 class="font-bold">Class {i + 1} Information</h2>
            <Button color="blue" on:click={() => sendClassReminder({
              studentList: [studentData],
              studentName: studentData.name,
              studentEmail: studentData.email,
              instructorName: value.instructorFirstName,
              instructorEmail: value.instructorEmail,
              otherInstructorEmails: value.otherInstructorEmails,
              className: value.course,
              nextMeetingTime: getNearestFutureClass(value.meetingTimes)
            })}>
              Send {value.course} Class Reminder To Student?
            </Button>
          </div>
          <fieldset class="mt-4 space-y-4">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th class="border-b p-2">Course</th>
                  <th class="border-b p-2">Instructor</th>
                  <th class="border-b p-2">Instructor Email</th>
                  <th class="border-b p-2">Meeting Link</th>
                  <th class="border-b p-2">Format</th>
                  <th class="border-b p-2">Class Times</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b">
                  <td class="p-2">{value.course}</td>
                  <td class="p-2">{value.instructorFirstName} {value.instructorLastName}</td>
                  <td class="p-2">{value.instructorEmail}</td>
                  <td class="p-2">{value.meetingLink}</td>
                  <td class="p-2">{value.online ? 'Online' : 'In-Person'}</td>
                  <td class="p-2">{formatClassTimes([value.classDay1, value.classDay2], [value.classTime1, value.classTime2])}</td>
                </tr>
              </tbody>
            </table>
            <h2 class="font-bold">Attendance</h2>
            <table class="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th class="border-b p-2">Class Number</th>
                  <th class="border-b p-2">Date</th>
                  <th class="border-b p-2">Attended</th>
                  <th class="border-b p-2">Feedback</th>
                </tr>
              </thead>
              {#each attendance as att}
                {#if att.courseName === value.course && att.id.includes(value.id) && Object.keys(att.attendanceList).includes(studentData.name)}
                  <tbody>
                    <tr class="border-b">
                      <td class="p-2">{att.classNumber}</td>
                      <td class="p-2">{att.date}</td>
                      <td class="p-2">{att.attendanceList[studentData.name] ? 'Yes' : 'No'}</td>
                      <td class="p-2">{att.feedback}</td>
                    </tr>
                  </tbody>
                {/if}
              {/each}
            </table>
          </fieldset>
        </Card>
      {/each}
    </div>

    <Card class="mb-4 mt-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-bold">Student Information</h2>
        <Button on:click={() => copyEmails(studentData.email.concat(studentData.secondaryEmail ? ', ' + studentData.secondaryEmail : ''))} class="flex items-center gap-1">
          <svg fill="#000" height="20" width="20" viewBox="0 0 352.804 352.804">
            <g>
              <path d="M318.54,57.282h-47.652V15c0-8.284-6.716-15-15-15H34.264c-8.284,0-15,6.716-15,15v265.522c0,8.284,6.716,15,15,15h47.651
         v42.281c0,8.284,6.716,15,15,15H318.54c8.284,0,15-6.716,15-15V72.282C333.54,63.998,326.824,57.282,318.54,57.282z
          M49.264,265.522V30h191.623v27.282H96.916c-8.284,0-15,6.716-15,15v193.24H49.264z M303.54,322.804H111.916V87.282H303.54V322.804
         z"/>
            </g>
          </svg>
          <span>Copy</span>
        </Button>
      </div>
      <div class="m-5 overflow-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr>
              <th class="border-b p-2">Student Name</th>
              <th class="border-b p-2">Email</th>
              <th class="border-b p-2">Secondary Email</th>
              <th class="border-b p-2">Phone</th>
              <th class="border-b p-2">Grade</th>
              <th class="border-b p-2">School</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b">
              <td class="p-2">{studentData.name}</td>
              <td class="p-2">{studentData.email}</td>
              <td class="p-2">{studentData.secondaryEmail}</td>
              <td class="p-2">{studentData.phone}</td>
              <td class="p-2">{studentData.grade}</td>
              <td class="p-2">{studentData.school}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="lg:w-1/2">
        <Select bind:value={selectedClass} options={classesOptions} label="Select a class" floating />
      </div>
      <Button color="green" on:click={() => addClass(selectedClassId)} class="mt-4">Add Class</Button>
      <div class="lg:w-1/2">
        <Select bind:value={selectedDropClass} options={dropClassesOptions} label="Select a class" floating />
      </div>
      <Button color="red" on:click={() => dropClass(selectedDropClassId)} class="mt-4">Drop Class</Button>
    </Card>
  </div>
</Dialog>