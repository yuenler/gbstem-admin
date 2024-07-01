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
    let data: Data.StudentFeedback[] = []
    let loading = true
  
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
      const q = query(collection(db, 'classFeedback24'))
      const classFeedback = await getDocs(q)
      classFeedback.forEach(async (document) => {
        const session = document.data()
          let tempClass: Data.StudentFeedback = {
            instructorName: '',
            studentName: '',
            feedback: '',
            rating: 0,
            course: '',
            date: '',
          }
          tempClass.instructorName = session.instructor
          tempClass.date = session.date
          tempClass.feedback = session.feedback
          tempClass.studentName = session.studentName
          tempClass.course = session.course
          tempClass.rating = session.rating
          data.push(tempClass)
        })
      return data
    }
  </script>
  
  {#await data then feedback}
    <Table>
      <svelte:fragment slot="head">
        <th scope="col" class="px-6 py-3">Student Name</th>
        <th scope="col" class="px-6 py-3">Course</th>
        <th scope="col" class="px-6 py-3">Instructor Name</th>
        <th scope="col" class="px-6 py-3">Date</th>
        <th scope="col" class="px-6 py-3">Feedback</th>
        <th scope="col" class="px-6 py-3">Rating</th>
      </svelte:fragment>
      <svelte:fragment slot="body">
        {#each feedback as value}
          <tr class="bg-white border-b hover:bg-gray-50 hover:cursor-pointer">
            <td class="px-6 py-4"> {value.studentName} </td>
            <td class="px-6 py-4">
                {value.course}
            </td>
            <td class="px-6 py-4">
              {value.instructorName}
            </td>   
            <td class="px-6 py-4">{value.date}</td>
            <td class="px-6 py-4">
              {value.feedback}
            </td>
            <td class="px-6 py-4">
                {value.rating}
            </td>
          </tr>
        {/each}
      </svelte:fragment>
    </Table>
  {/await}
  