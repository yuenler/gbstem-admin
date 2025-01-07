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
  import Select from '$lib/components/Select.svelte'
  import type { PageData } from './$types'
  import { page } from '$app/stores'

  let showValidation = false
  let currentUser: Data.User.Store
  let scheduled = false
  export let data: PageData
  let loading = true
  let dialogEl: Dialog
  let selectedFeedbackId: string | undefined = undefined

  let courseFilter: 'Scratch' | 'Python' | 'Python II' | 'Web Development' | 'Engineering I' | 'Engineering II' | 'Engineering III' | 'Math I' | 'Math II' | 'Math III' | 'Math IV' | 'Math V' | 'Environmental Science' | 'all'=
    ($page.url.searchParams.get('filter') as any) ?? 'all'
  
  let filterRef = ''

  $: {
    const base = $page.url.searchParams
      base.set('filter', courseFilter)
      base.delete('updated')
    filterRef = `?${base.toString()}`
  }

  onMount(() => {
    return user.subscribe(async (user) => {
      if (user) {
        currentUser = user
        // data = await getData()
        loading = false
      }
    })
  })

  // async function getData() {
  //   const q = query(collection(db, instructorFeedbackCollection))
  //   const classFeedback = await getDocs(q)
  //   classFeedback.forEach(async (document) => {
  //     const session = document.data()
  //     let tempClass: Data.InstructorFeedback = {
  //         instructorName: '',
  //         students: [],
  //         feedback: '',
  //         attendanceList: [],
  //         courseName: '',
  //         date: '',
  //         classNumber: 0,
  //         id: document.id,
  //       }
  //       tempClass.students = Object.keys(session.attendanceList)        
  //       tempClass.instructorName = session.instructorName
  //       tempClass.date = session.date
  //       tempClass.feedback = session.feedback
  //       tempClass.courseName = session.courseName
  //       tempClass.attendanceList = Object.values(session.attendanceList)
  //       tempClass.classNumber = session.classNumber
  //       data.push(tempClass)
  //     })
  //   return data.sort((a, b) => {
  //     return new Date(b.date).getTime() - new Date(a.date).getTime()
  //   })
  // }

  function getAttendancePercent(value: boolean[]) {
    const attended = value.filter((attended:boolean) => attended === true).length
    const total = value.length
    return `${(attended / total) * 100}%`
  }

</script>

<ClassFeedbackDetails bind:dialogEl id={selectedFeedbackId} />

<div class="flex justify-end">
  <Select
    bind:value={courseFilter}
    label="Filter"
    options={[{ name: 'Scratch' }, { name: 'Python I' }, {name: 'Python II'}, {name: 'Web Development'}, {name: 'Math I'}, {name: 'Math II'}, {name: 'Math III'}, {name: 'Math IV'}, {name: 'Math V'}, {name: 'Engineering I'}, {name: 'Engineering II'}, {name: 'Engineering III'}, {name: 'Environmental Science'}, {name: 'all'}]}
    floating
    required
  />
  <a
    href={filterRef}
    class="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg"
  >
    Filter
  </a>
</div>

{#await data.feedback then feedback}
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
          {value.courseName}
        </td>
        <td class="px-6 py-4">
          {value.classNumber}
        </td>
        <td class="px-6 py-4">{value.date}</td>
        <td class="px-6 py-4">{getAttendancePercent(value.attendanceList)}</td>
        <td class="px-6 py-4">
          {value.feedback}
        </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
{/await}
