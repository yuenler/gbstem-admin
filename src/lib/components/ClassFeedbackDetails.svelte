<script lang="ts">
  import {
    type Timestamp,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
  } from 'firebase/firestore'
  import Card from '$lib/components/Card.svelte'
  import { db } from '$lib/client/firebase'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import { alert } from '$lib/stores'
  import { instructorFeedbackCollection } from '$lib/data/collections'

  export let dialogEl: Dialog
  export let id: string | undefined

  let loading = true
  let disabled = true

  let values: Data.InstructorFeedback = {
    courseName: '',
    instructorName: '',
    feedback: '',
    date: '',
    classNumber: 0,
    attendanceList: [],
    id: '',
    students: [],
  }

  $: if (id !== undefined) {
    loading = true
    disabled = true
    getDoc(doc(db, instructorFeedbackCollection, id)).then((snapshot) => {
      let data = snapshot.data() as Data.InstructorFeedback
      if (snapshot.exists()) {
        values = data
      } else {
        alert.trigger('error', 'Registration not found.')
      }
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
    </div>
  </div>
</Dialog>
