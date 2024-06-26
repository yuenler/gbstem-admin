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
  import { cloneDeep } from 'lodash-es'
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
    course: '',
    instructorFirstName: '',
    instructorLastName: '',
    instructorEmail: '',
    classDay1: '',
    classTime1: '',
    classDay2: '',
    classTime2: '',
    meetingLink: '',
    classCap: 0,
    online: true,
    gradeRecommendation: '',
    classesStatus: [],
  }

  let meetingTimes: string[] = []

  let values: any = cloneDeep(defaultValues)
  $: if (id !== undefined) {
    studentList = []
    loading = true
    disabled = true
    values = cloneDeep(defaultValues)
    getDoc(doc(db, 'classesSpring24', id)).then((snapshot) => {
      let data = snapshot.data() as any

      meetingTimes = data.meetingTimes.map((time: Timestamp) =>
        new Date(time.seconds * 1000)).sort((a:Date, b:Date) => a.getTime() - b.getTime()).map((time:Date) => time.toISOString())

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

  function handleEdit() {
    disabled = false
  }
  function handleSaveChanges() {
    loading = true
    disabled = true
    if (id !== undefined) {
      setDoc(doc(db, 'classesSpring24', id), values)
        .then(() => {
          invalidate('app:registrations').then(() => {
            alert.trigger('success', 'Changes were saved successfully.')
            loading = false
          })
        })
        .catch((err: FirebaseError) => {
          console.log(err)
          alert.trigger('error', err.code, true)
          loading = false
        })
    }
  }
  function handleDeleteChanges() {
    disabled = true
    values = cloneDeep(dbValues)
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
  function sendInstructorReminder(instructorName: string, instructorEmail: string, className: string) {
    const confirmSend = confirm("Send class reminder to instructor?");
    let classTime: String = '';
        for (let i = 0; i < meetingTimes.length; i++){
            const meetingTime = new Date(meetingTimes[i])
          if (meetingTime && new Date().toDateString() === meetingTime.toDateString()) {
            classTime = formatDate(meetingTime);
            break;
          }
        }
      if(classTime === '') {
        const nextTime = confirm("No class today. Send reminder for next class?");
        if(nextTime) {
          for(let i = 0; i < meetingTimes.length; i++) {
            const meetingTime2 = new Date(meetingTimes[i])
            if(new Date().getTime() < meetingTime2.getTime()) {
              console.log(meetingTime2);
              classTime = formatDate(meetingTime2);
              break;
            }
          }
        } else {
          return;
        }
      }
    fetch('/api/remindInstructor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: instructorName,
          email: instructorEmail,
          class: className,
          classTime: classTime,
        }),
      }).then(async (res) => {
        if (res.ok) {
          alert.trigger('success', 'A reminder email was sent!')
        } else {
          const { message } = await res.json()
          alert.trigger('error', message)
        }
      });
  }

</script>

<Dialog bind:this={dialogEl} size="full" alert>
  <svelte:fragment slot="title">Class Details</svelte:fragment>
  <div slot="description">
    <Card class="sticky top-2 z-50 flex justify-between gap-3 p-3 md:p-3">
      {#if !disabled}
        <Button color="green" on:click={handleSaveChanges}>Save changes</Button>
        <Button color="red" on:click={handleDeleteChanges}
          >Cancel changes</Button
        >
      {/if}
      <div class="flex gap-3">
        <Button color = 'green' on:click={handleEdit}>Edit</Button>
        <Button color = 'red' on:click={dialogEl.cancel}>Close</Button>
        <Button color = 'blue' on:click = {() => sendInstructorReminder(values.instructorFirstName, values.instructorEmail, values.course)}>Send Instructor Reminder</Button>
      </div>
    </Card>
    <div class="mt-4 flex justify-center">
      <Form>
        <fieldset class="mt-4 space-y-4" {disabled}>
        <div class = "grid gap-1 sm:grid-cols-3 sm:gap-3">
          <Select
            bind:value={values.course}
            label="Course"
            options={coursesJson}
            floating
            required
          />
          <Input
            type="text"
            bind:value={values.gradeRecommendation}
            floating
            label="Grade recommendation. For example, 3-5 or 6-8."
          />
          <Input
            type="number"
            bind:value={values.classCap}
            label="Class capacity"
            floating
            required
          />
        </div>
          {#if values.online}
            <Input
              type="text"
              bind:value={values.meetingLink}
              label="Meeting link"
              floating
              required
            />
          {/if}

          <div class="grid gap-1">
            <span class="font-bold"
              >Online classes meet twice weekly at consistent days and times
              throughout the semester and run for 45-60 minutes each. In-person
              classes meet once a week on a weekend afternoon at the Cambridge
              Public Library.
            </span>

            <div class="grid gap-1 sm:grid-cols-3 sm:gap-3">
              <div class="sm:col-span-2">
                <Select
                  bind:value={values.classDay1}
                  label="Meeting day 1"
                  options={daysOfWeekJson}
                  floating
                  required
                />
              </div>
              <Input
                type="time"
                bind:value={values.classTime1}
                label="Meeting time 1"
                floating
                required
              />
            </div>

            {#if values.online}
              <div class="grid gap-1 sm:grid-cols-3 sm:gap-3">
                <div class="sm:col-span-2">
                  <Select
                    bind:value={values.classDay2}
                    label="Meeting day 2"
                    options={daysOfWeekJson}
                    floating
                    required
                  />
                </div>
                <Input
                  type="time"
                  bind:value={values.classTime2}
                  label="Meeting time 2"
                  floating
                />
              </div>
            {/if}
          </div>
          <Input
            type="checkbox"
            bind:value={values.online}
            label="Class taught online?"
          />
        </fieldset>
      </Form>
    </div>

    <div>
      <Card class="mb-4 mt-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-bold">Class List</h2>
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
          <table style="border-collapse: collapse; width: 100%; text-align: left;">
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
      <div>
        <table
          class="grid grid-cols-1 justify-between gap-1"
          style="margin-top:1rem;"
        >
          <div>
            <div
              class="rounded-lg bg-gray-100 p-4 mb-2"
            >
              <strong>Schedule</strong>
            </div>
            {#if meetingTimes}
              {#each meetingTimes as meetingTime, i}
              {#if values.classesStatus[i] === 'allComplete'}
              <div class="rounded-lg bg-green-100 p-4 mb-2">
                <div class="flex items-center justify-between">
                  <p class="meeting-time">
                    {formatDate(meetingTime)}
                  </p>
                </div>
                </div>
              {:else if values.classesStatus[i] === 'missingFeedback'}
              <div class="rounded-lg bg-yellow-100 p-4 mb-2">
                <div class="flex items-center justify-between">
                  <p class="meeting-time">
                    {formatDate(meetingTime)}
                  </p>
                </div>
                </div>
              {:else if values.classesStatus[i] === 'upcoming'}
                <div class="rounded-lg bg-blue-100 p-4 mb-2">
                  <div class="flex items-center justify-between">
                    <p class="meeting-time">
                      {formatDate(meetingTime)}
                    </p>
                  </div>
                  </div>
              {:else if values.classesStatus[i] === 'classMissed'}
                  <div class="rounded-lg bg-red-100 p-4 mb-2">
                    <div class="flex items-center justify-between">
                      <p class="meeting-time">
                        {formatDate(meetingTime)}
                      </p>
                    </div>
                    </div>
              {:else}
              <div class="rounded-lg bg-gray-100 p-4 mb-2">
                <div class="flex items-center justify-between">
                  <p class="meeting-time">
                    {formatDate(meetingTime)}
                  </p>
                </div>
                </div>
              {/if}
              {/each}
            {/if}
          </div>
        </table>
      </div>
    </div>
  </div>
</Dialog>
