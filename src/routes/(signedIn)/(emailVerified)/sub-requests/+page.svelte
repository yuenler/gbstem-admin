<script lang="ts">
    import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore'
    import { db, user } from '$lib/client/firebase'
    import { onMount } from 'svelte'
    import { subRequestsCollection } from '$lib/data/collections'
    import Table from '$lib/components/Table.svelte'
    import { ClassStatus } from '$lib/data/types/ClassStatus'
    import { formatDate, timestampToDate } from '$lib/utils'
    import Dialog from '$lib/components/Dialog.svelte'
    import Card from '$lib/components/Card.svelte'
    import { sub } from 'date-fns'
    import { SubRequestStatus } from '$lib/data/helpers/SubRequestStatus'
    import Button from '$lib/components/Button.svelte'

    let subRequests: Data.SubRequest[] = []
    let dialogEl: Dialog[]
    let notes = ''
 
    onMount(async () => {  
        dialogEl = new Array(subRequests.length).fill(null);
        const q = query(collection(db, subRequestsCollection))
        const querySnapshot = await getDocs(q)
        subRequests = querySnapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id
            })) as Data.SubRequest[];
})
 </script>
<div>
    <Table>
    <svelte:fragment slot="head">
      <th scope="col" class="px-6 py-3">Class</th>
      <th scope="col" class="px-6 py-3">Original Instructor Email</th>
      <th scope="col" class="px-6 py-3">Date Of Class</th>
      <th scope="col" class="px-6 py-3">Request Status</th>
      <th scope="col" class="px-6 py-3">Substitute Instructor</th>
      <th scope="col" class="px-6 py-3">Substitute Instructor Email</th>
    </svelte:fragment>
    <svelte:fragment slot="body">
        {#each subRequests as subRequest, i}
        <Dialog bind:this={dialogEl[i]}>
            <svelte:fragment slot="title"><div class="flex items-center justify-between">Sub Request Notes<Button color='red' on:click={dialogEl[i].cancel}>Close</Button></div></svelte:fragment>
            <Card slot="description">{subRequest.notes}</Card>
        </Dialog>
        <tr
          class={`${subRequest.subRequestStatus === SubRequestStatus.NoSubstituteNeeded ? 'bg-green-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFeedbackNeeded ? 'bg-yellow-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFound ? 'bg-blue-100' : 'bg-red-100'} border-b border-white hover:bg-white hover:cursor-pointer`}
          on:click={() => {
            dialogEl[i].open()
          }}
        >
          <td class="px-6 py-4">
          { subRequest.course + ', Class #' + subRequest.classNumber }
          </td>
          <td class="px-6 py-4">
            {subRequest.originalInstructorEmail}
          </td>
          <td class="px-6 py-4">
            {formatDate(timestampToDate(subRequest.dateOfClass))}
          </td>
          <td class="px-6 py-4">
            {subRequest.subRequestStatus}
          </td>
          <td class="px-6 py-4">
            {subRequest.subInstructorFirstName}
          </td>
          <td class="px-6 py-4">
            {subRequest.subInstructorEmail}
          </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
</div>