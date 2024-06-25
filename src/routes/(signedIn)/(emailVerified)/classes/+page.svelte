<script lang="ts">
  import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore'
  import { db, user } from '$lib/client/firebase'
  import { onMount } from 'svelte'
  import Table from '$lib/components/Table.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import { formatTime24to12 } from '$lib/utils'
  import { format } from 'date-fns'
  import ClassDetails from '$lib/components/ClassDetails.svelte'
  import type { PageData } from './$types'

  export let data: PageData
  let showValidation = false
  let currentUser: Data.User.Store
  let scheduled = false
  let loading = true
  let selectedClassId: string | undefined = undefined

  let dialogEl: Dialog

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

  // onMount(() => {
  //   return user.subscribe(async (user) => {
  //     if (user) {
  //       currentUser = user
  //       data = await getData()
  //       loading = false
  //     }
  //   })
  // })

  // async function getData() {
  //   const q = query(collection(db, 'classesSpring24'))
  //   const classes = await getDocs(q)
  //   classes.forEach(async (document) => {
  //     let d = document.data()
  //     d = {
  //       ...d,
  //       id: document.id,
        
  //     }
  //     data.push(d)
  //   })
  //   return data
  // }
</script>

<ClassDetails bind:dialogEl id={selectedClassId} />

{#await data then feedback}
  <Table>
    <svelte:fragment slot="head">
      <th scope="col" class="px-6 py-3">Instructor Name</th>
      <th scope="col" class="px-6 py-3">Instructor Email</th>
      <th scope="col" class="px-6 py-3">Course</th>
      <th scope="col" class="px-6 py-3">Meeting Link</th>
      <th scope="col" class="px-6 py-3">Class Time</th>
      <th scope="col" class="px-6 py-3">Number of students</th>
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#each feedback.classes as value, i}
        <tr
          class="bg-white border-b hover:bg-gray-50 hover:cursor-pointer"
          on:click={() => {
            selectedClassId = value.id
            dialogEl.open()
          }}
        >
          <td class="px-6 py-4">
            {value.name}
          </td>
          <td class="px-6 py-4">
            {value.email}
          </td>
          <td class="px-6 py-4">
            {value.classes}
          </td>
          <td class="px-6 py-4">
            {value.meetingLink}
          </td>
          <td class="px-6 py-4">
            {value.classTimes.join(', ')}
          </td>
          <td class="px-6 py-4">
            {value.students ? value.students.length : 0}
          </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
{/await}
