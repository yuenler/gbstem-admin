<script lang="ts">
  import {
    collection,
    query,
    getDocs,
    updateDoc,
    doc,
    getDoc,
  } from 'firebase/firestore'
  import { db, user } from '$lib/client/firebase'
  import Form from '$lib/components/Form.svelte'
  import clsx from 'clsx'
  import { alert } from '$lib/stores'
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import Table from '$lib/components/Table.svelte'
  import { json } from '@sveltejs/kit'
  import { connectStorageEmulator } from 'firebase/storage'
  import ClassFeedbackDetails from '$lib/components/ClassFeedbackDetails.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
    import { instructorFeedbackCollection } from '$lib/data/collections'

  let showValidation = false
  let currentUser: Data.User.Store
  let scheduled = false
  let data: Data.InstructorFeedback[] = []
  let loading = true
  let dialogEl: Dialog
  let selectedFeedbackId: string | undefined = undefined

  onMount(() => {
    return user.subscribe(async (user) => {
      if (user) {
        currentUser = user
        data = await getData()
        loading = false
      }
    })
  })

  async function getData() {
    const q = query(collection(db, instructorFeedbackCollection))
    const classFeedback = await getDocs(q)
    classFeedback.forEach(async (document) => {
      const session = document.data()
      let tempClass: Data.InstructorFeedback = {
          instructorName: '',
          students: [],
          feedback: '',
          attendance: [],
          course: '',
          date: '',
          classNumber: 0,
          id: document.id,
        }
        tempClass.students = Object.keys(session.attendanceList)        
        tempClass.instructorName = session.instructorName
        tempClass.date = session.date
        tempClass.feedback = session.feedback
        tempClass.course = session.courseName
        tempClass.attendance = Object.values(session.attendanceList)
        tempClass.classNumber = session.classNumber
        data.push(tempClass)
      })
    return data
  }

  function getAttendancePercent(value: Data.InstructorFeedback) {
    const attended = value.attendance.filter((attended) => attended.present === true).length 
    const total = value.students.length
    return `${(attended / total) * 100}%`
  }

</script>

<ClassFeedbackDetails bind:dialogEl id={selectedFeedbackId} />

{#await data then feedback}
  <Table>
    <svelte:fragment slot="head">
      <th scope="col" class="px-6 py-3">Instructor Name</th>
      <th scope="col" class="px-6 py-3">Course</th>
      <th scope="col" class="px-6 py-3">Class Number</th>
      <th scope="col" class="px-6 py-3">Date</th>
      <th scope="col" class="px-6 py-3">Attendance Percent</th>
      <th scope="col" class="px-6 py-3">Feedback</th>
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#each feedback as value}
        <tr
          class="bg-white border-b hover:bg-gray-50 hover:cursor-pointer"
          on:click={() => {
            selectedFeedbackId = value.id
            dialogEl.open()
          }}
        >
        <td class="px-6 py-4">
          {`${value.instructorName}`}
        </td>
        <td class="px-6 py-4">
          {value.course}
        </td>
        <td class="px-6 py-4">
          {value.classNumber}
        </td>
        <td class="px-6 py-4">{value.date}</td>
        <td class="px-6 py-4">{getAttendancePercent(value)}</td>
        <td class="px-6 py-4">
          {value.feedback}
        </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
{/await}
