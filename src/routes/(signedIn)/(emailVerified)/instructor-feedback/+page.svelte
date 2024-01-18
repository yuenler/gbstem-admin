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

  let showValidation = false
  let currentUser: Data.User.Store
  let scheduled = false
  let data: Data.InstructorFeedback[] = []
  let loading = true

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short', // long, short, narrow
      month: 'short', // numeric, 2-digit, long, short, narrow
      day: 'numeric', // numeric, 2-digit
      hour: 'numeric', // numeric, 2-digit
      minute: 'numeric', // numeric, 2-digit
      hour12: true, // use 12-hour time format with AM/PM
    })
  }

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
    const q = query(collection(db, 'instructorFeedback24'))
    const classFeedback = await getDocs(q)
    classFeedback.forEach(async (document) => {
      const session = document.data()
      const keys = Object.keys(session.attendanceList)
      keys.forEach((key) => {
        let tempClass: Data.InstructorFeedback = {
          instructorName: '',
          studentName: '',
          feedback: '',
          attendance: false,
          course: '',
          date: '',
        }
        tempClass.instructorName = session.instructorName
        tempClass.date = session.date
        tempClass.feedback = session.feedback
        tempClass.studentName = key
        tempClass.course = session.courseName
        tempClass.attendance = session.attendanceList[key].present
        data.push(tempClass)
      })
    })
    return data
  }
</script>

{#await data then feedback}
  <Table>
    <svelte:fragment slot="head">
      <th scope="col" class="px-6 py-3">Instructor Name</th>
      <th scope="col" class="px-6 py-3">Student Name</th>
      <th scope="col" class="px-6 py-3">Course</th>
      <th scope="col" class="px-6 py-3">Date</th>
      <th scope="col" class="px-6 py-3">Attendance</th>
      <th scope="col" class="px-6 py-3">Feedback</th>
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#each feedback as value}
        <tr class="bg-white border-b hover:bg-gray-50 hover:cursor-pointer">
          <td class="px-6 py-4">
            {`${value.instructorName}`}
          </td>
          <td class="px-6 py-4"> {value.studentName} </td>
          <td class="px-6 py-4">
            {value.course}
          </td>
          <td class="px-6 py-4">{value.date}</td>
          <td class="px-6 py-4">{value.attendance}</td>
          <td class="px-6 py-4">
            {value.feedback}
          </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
{/await}
