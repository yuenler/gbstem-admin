<script>
  import { onMount } from 'svelte'
  import { db } from '$lib/client/firebase'
  import { doc, setDoc, updateDoc } from 'firebase/firestore'
  import { flip } from 'svelte/animate'

  let updatedHHID = false
  let updateFailed = false

  onMount(() => {
    // Get the slug from the URL
    const hhid = window.location.pathname.split('/').pop()

    // Get the user's reference from the database using doc
    const hhidRef = doc(db, 'hhids', hhid)

    // Update the user's checkedIn field using updateDoc()
    const updateData = { checkedIn: true }

    // Update doc
    updateDoc(hhidRef, updateData)
      .then(() => {
        console.log(`Successfully updated HHID ${hhid}`)
        updatedHHID = true
      })
      .catch((error) => {
        console.error(`Error updating HHID ${hhid}:`, error)
        updateFailed = true
      })
  })
</script>

<svelte:head>
  <title>Check In</title>
</svelte:head>

<div class="text-center">
  {#if updatedHHID}
    <span
      class="rounded-md bg-green-200 px-5 py-2 w-100 text-lg font-bold"
      href="/"
      >Participant successfully checked in :)
    </span>
  {:else if updateFailed}
    <span
      class="rounded-md bg-red-200 px-5 py-2 w-100 text-lg font-bold"
      href="/"
      >Error: participant not successfully checked in :(
    </span>
  {:else}
    <span
      class="rounded-md bg-gray-200 px-5 py-2 w-100 text-lg font-bold"
      href="/"
      >Attempting to check in participant.
    </span>
    <br /><br />
    <small>Check your connection if this takes more than a secondg...</small
    >{/if}
</div>
