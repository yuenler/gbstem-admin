<script lang="ts">
  import {
    type Timestamp,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
    query,
    getDocs,
    collection,
    where,
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
  import {onMount} from 'svelte'
  import { copyEmails, formatClassTimes, formatDateString, formatTime24to12, getNearestFutureClass, normalizeCapitals, timestampToDate } from '$lib/utils'
  import { classesCollection, instructorFeedbackCollection, registrationsCollection } from '$lib/data/collections'
  import type ClassData from '$lib/data/types/ClassData'
  import type Student from '$lib/data/types/Student'
  import sendClassReminder from '$lib/data/helpers/sendClassReminders'

  export let dialogEl: Dialog
  export let id: string | undefined

  let loading = true

  let studentData: Student = {
    name: '',
    email: '',
    secondaryEmail: '',
    phone: '',
    grade: 0,
    school: '',
  }

  let attendance: Data.InstructorFeedback[] = []
  let classes: ClassData[] = [] 

    $: if (id !== undefined && loading) {
        const studentDocRef = doc(db, registrationsCollection, id);
        getDoc(studentDocRef).then((studentDoc) => {
            if (studentDoc.exists()) {
                const data = studentDoc.data();
                if (data) {
                    studentData = {
                        name: `${data.personal.studentFirstName} ${data.personal.studentLastName}`,
                        email: data.personal.email,
                        secondaryEmail: data.personal.secondaryEmail,
                        phone: data.personal.phoneNumber,
                        grade: data.academic.grade,
                        school: data.academic.school,
                    };
                }
            }
        });

        getDocs(query(collection(db, instructorFeedbackCollection))).then((snapshot) => {
            attendance = []
            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data) {
                    attendance.push({
                        courseName: data.courseName,
                        date: data.date,
                        attendanceList: data.attendanceList,
                        feedback: data.feedback, 
                        id: doc.id,
                        classNumber: data.classNumber,
                        instructorName: data.instructorName,
                        students: data.students,
                    });
                }
            });
            attendance.sort((a, b) => a.classNumber - b.classNumber);
        })

        getDocs(query(collection(db, classesCollection), where('students', 'array-contains', id))).then((snapshot) => {
            classes = []
            snapshot.forEach((doc) => {
                const data = doc.data() as ClassData;
                if (data) {
                    data.id = doc.id;
                    classes.push(data);
                } else {
                    alert.trigger('error', 'Registration not found.');
                }
            });
        }).then(() => {
            loading = false;
        });
    }

</script>

<Dialog bind:this={dialogEl} size="full" alert>
    <svelte:fragment slot="title"><div class="flex" style="justify-content:space-between;"><div style="align-content:center;">Student Attendance and Information</div><div><Button color = 'red' on:click={dialogEl.cancel}>Close</Button></div></div></svelte:fragment>
    <div slot="description">
    <div class="mt-4 justify-center">
    {#each classes as value, i}
      <Card>
          <div class="flex" style="justify-content:space-between;"><div style="align-content:center;"><h2 class="font-bold">Class {i+1} Information</h2></div><div><Button color = 'blue' on:click = {() => sendClassReminder({
            studentList: [studentData],
            studentName: studentData.name,
            studentEmail: studentData.email,
            instructorName: value.instructorFirstName,
            instructorEmail: value.instructorEmail,
            otherInstructorEmails: value.otherInstructorEmails,
            className: value.course,
            nextMeetingTime: getNearestFutureClass(value.meetingTimes)
          })}>Send {value.course} Class Reminder To Student?</Button> </div></div>
        <fieldset class="mt-4 space-y-4">
            <table style="border-collapse: collapse; width: 100%; text-align: left;">
                <thead>
                  <tr>
                    <th
                      style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                      >Course</th
                    >
                    <th
                      style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                      >Instructor</th
                    >
                    <th
                      style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                      >Instructor Email</th
                    >
                    <th
                      style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                      >Meeting Link</th
                    >
                    <th
                      style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                      >Format</th
                    >
                    <th
                      style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                      >Class Times</th
                    >
                  </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ccc;">
                      <td style="padding: 8px;">{value.course}</td>
                      <td style="padding: 8px;">{value.instructorFirstName + ' ' + value.instructorLastName}</td>
                      <td style="padding: 8px;">{value.instructorEmail}</td>
                      <td style="padding: 8px;">{value.meetingLink}</td>
                      <td style="padding: 8px;">{value.online? 'Online' : 'In-Person'}</td>
                      <td style="padding: 8px;">{formatClassTimes([value.classDay1, value.classDay2], [value.classTime1, value.classTime2])}</td>
                    </tr>
                </tbody>
              </table>
              <h2 class="font-bold">Attendance</h2>
                <table style="border-collapse: collapse; width: 100%; text-align: left;">
                    <thead>
                    <tr>
                        <th
                        style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                        >Class Number</th
                        >
                        <th
                        style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                        >Date</th
                        >
                        <th
                        style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                        >Attended</th
                        >
                        <th
                        style="white-space: nowrap; border-bottom: 1px solid #ccc; padding: 8px;"
                        >Feedback</th
                        >
                    </tr>
                    </thead>
                    {#each attendance as att, i}
                     {#if att.courseName === value.course && att.id.includes(value.id) && Object.keys(att.attendanceList).includes(studentData.name)}
                    <tbody>
                        <tr style="border-bottom: 1px solid #ccc;">
                        <td style="padding: 8px;">{att.classNumber}</td>
                        <td style="padding: 8px;">{att.date}</td>
                        <td style="padding: 8px;">{att.attendanceList[studentData.name]? 'Yes' : 'No'}</td>
                        <td style="padding: 8px;">{att.feedback}</td>
                        </tr>
                    </tbody>
                    {/if}
                    {/each}
                </table>
        </fieldset>
    </Card>
    {/each}
    </div>

    <div>
      <Card class="mb-4 mt-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-bold">Student Information</h2>
          <Button on:click={() => copyEmails(studentData.email.concat(studentData.secondaryEmail ? ', ' + studentData.secondaryEmail : ''))} class="flex items-center gap-1">
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
                <tr style="border-bottom: 1px solid #ccc;">
                  <td style="padding: 8px;">{studentData.name}</td>
                  <td style="padding: 8px;">{studentData.email}</td>
                  <td style="padding: 8px;">{studentData.secondaryEmail}</td>
                  <td style="padding: 8px;">{studentData.phone}</td>
                  <td style="padding: 8px;">{studentData.grade}</td>
                  <td style="padding: 8px;">{studentData.school}</td>
                </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</Dialog>
