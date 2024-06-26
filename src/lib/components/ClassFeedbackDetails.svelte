<script lang="ts">
  import {
    type Timestamp,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
  } from 'firebase/firestore'
  import Input from '$lib/components/Input.svelte'
  import Select from '$lib/components/Select.svelte'
  import Card from '$lib/components/Card.svelte'
  import Form from '$lib/components/Form.svelte'
  import { db } from '$lib/client/firebase'
  import Field from '$lib/components/Field.svelte'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import { alert } from '$lib/stores'
  import { attempt, cloneDeep } from 'lodash-es'
  import type { FirebaseError } from 'firebase/app'
  import { invalidate } from '$app/navigation'
  import nProgress from 'nprogress'
  import { coursesJson, daysOfWeekJson } from '$lib/data'

  export let dialogEl: Dialog
  export let id: string | undefined

  let loading = true
  let disabled = true
  let dbValues: Data.Registration<'client'>

  let studentList: {
    name: string
    email: string
    secondaryEmail: string
    phone: string
    grade: number
    school: string
  }[] = []

  const defaultValues = {
    courseName: '',
    instructorName: '',
    feedback: '',
    date: '',
    classNumber: '',
    attendanceList: {},
  }

  let meetingTimes: string[] = []

  let values: any = cloneDeep(defaultValues)
  $: if (id !== undefined) {
    studentList = []
    loading = true
    disabled = true
    values = cloneDeep(defaultValues)
    getDoc(doc(db, 'instructorFeedback24', id)).then((snapshot) => {
      let data = snapshot.data() as any
      const studentUids = data.students
      if (studentUids) {
        getStudentList(studentUids)
      }
      if (snapshot.exists()) {
        values = cloneDeep(data)
        dbValues = cloneDeep(data)
      } else {
        alert.trigger('error', 'Registration not found.')
      }
    })
  }

  const getStudentList = (studentUids: string[]) => {
    studentUids.forEach((studentUid) => {
      const studentDocRef = doc(db, 'registrationsSpring24', studentUid)
      getDoc(studentDocRef).then((studentDoc) => {
        if (studentDoc.exists()) {
          const data = studentDoc.data()
          if (data) {
            studentList.push({
              name: `${data.personal.studentFirstName} ${data.personal.studentLastName}`,
              email: data.personal.email,
              secondaryEmail: data.personal.secondaryEmail,
              phone: data.personal.phoneNumber,
              grade: data.academic.grade,
              school: data.academic.school,
            })
          }
          studentList = [...studentList]
        }
      })
    })
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function copyEmails() {
    const emailList = studentList
      .map(
        (student) =>
          `${student.email}${
            student.secondaryEmail ? `, ${student.secondaryEmail}` : ''
          }`,
      )
      .join(', ')

    navigator.clipboard
      .writeText(emailList)
      .then(() => {
        alert.trigger('success', 'Emails copied to clipboard!')
      })
      .catch((err) => {
        alert.trigger('error', 'Failed to copy emails to clipboard!')
      })
  }
</script>

<Dialog bind:this={dialogEl} size="full" alert>
  <svelte:fragment slot="title"
    ><div class="flex" style="justify-content:space-between;"><div style="align-content:center;">Feedback for {values.instructorName}'s {values.courseName} Class #{values.classNumber}</div><div><Button color="red" on:click={dialogEl.cancel}>Close</Button></div></div></svelte:fragment
  >
  <div slot="description">
    <div style="text-align:left;">
        <Card class="mb-4">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-bold">Class Details</h2>
          </div>
          <div class="m-5" style="overflow: auto;">
            <table style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr>
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Course Name</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Class Number</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Instructor</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Feedback</th
                  >
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #ccc;">
                  <td style="padding: 8px;">{values.courseName}</td>
                  <td style="padding: 8px;">{values.classNumber}</td>
                  <td style="padding: 8px;">{values.instructorName}</td>
                  <td style="padding: 8px;">{values.feedback}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card class="mb-4 mt-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-bold">Student Attendance</h2>
          </div>
          <div class="m-5" style="overflow: auto;">
            <table style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr>
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Student Name</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Attendance</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each Object.keys(values.attendanceList) as attendance, i}
                  <tr style="border-bottom: 1px solid #ccc;">
                    <td style="padding: 8px;">{attendance}</td>
                    <td style="padding: 8px;"
                      >{values.attendanceList[attendance].present}</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </Card>
        <Card class="mb-4 mt-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-bold">Student Details</h2>
            <Button on:click={copyEmails} class="flex items-center gap-1">
              <svg
                fill="#000000"
                height="20"
                width="20"
                version="1.1"
                id="Capa_1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 352.804 352.804"
                xml:space="preserve"
              >
                <g>
                  <path
                    d="M318.54,57.282h-47.652V15c0-8.284-6.716-15-15-15H34.264c-8.284,0-15,6.716-15,15v265.522c0,8.284,6.716,15,15,15h47.651
           v42.281c0,8.284,6.716,15,15,15H318.54c8.284,0,15-6.716,15-15V72.282C333.54,63.998,326.824,57.282,318.54,57.282z
            M49.264,265.522V30h191.623v27.282H96.916c-8.284,0-15,6.716-15,15v193.24H49.264z M303.54,322.804H111.916V87.282H303.54V322.804
           z"
                  />
                </g>
              </svg>
              <span>Copy</span>
            </Button>
          </div>
          <div class="m-5" style="overflow: auto;">
            <table style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr>
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Student Name</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Email</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Secondary Email</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Phone</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >Grade</th
                  >
                  <th
                    style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                    >School</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each studentList as student}
                  <tr style="border-bottom: 1px solid #ccc;">
                    <td style="padding: 8px;">{student.name}</td>
                    <td style="padding: 8px;">{student.email}</td>
                    <td style="padding: 8px;">{student.secondaryEmail}</td>
                    <td style="padding: 8px;">{student.phone}</td>
                    <td style="padding: 8px;">{student.grade}</td>
                    <td style="padding: 8px;">{student.school}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  </div>
</Dialog>
