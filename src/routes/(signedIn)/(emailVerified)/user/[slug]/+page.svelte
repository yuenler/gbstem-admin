<script lang="ts">
  import { db } from '$lib/client/firebase'
  import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
  import type { PageData } from './$types'
  import Button from '$lib/components/Button.svelte'
  import { format } from 'date-fns'
  import { invalidateAll } from '$app/navigation'

  export let data: PageData

  function handleCheckIn() {
    const hhidRef = doc(db, 'hhids', data.applicant.user.hhid)
    updateDoc(hhidRef, {
      checkedIn: true,
      checkedInAt: serverTimestamp(),
      food: {
        '2023-10-20': {
          dinner: false,
        },
        '2023-10-21': {
          breakfast: false,
          lunch: false,
          dinner: false,
        },
        '2023-10-22': {
          breakfast: false,
        },
      },
    }).then(() => {
      invalidateAll()
    })
  }

  function handleMeal(date: string, meal: string, state: boolean) {
    updateDoc(doc(db, 'hhids', data.applicant.user.hhid), {
      [`food.${date}.${meal}`]: !state,
    }).then(() => {
      invalidateAll()
    })
  }
</script>

<svelte:head>
  <title>Check In</title>
</svelte:head>

<div>
  <div>
    <div>
      {`${data.applicant.user.firstName} ${data.applicant.user.lastName}`}
    </div>
    <div>
      {data.applicant.user.hhid}
    </div>
  </div>
  {#if data.applicant.confirmed}
    <div>Confirmation form was submitted.</div>
    <div class="flex gap-2">
      <div>Checked in:</div>
      <div>
        {#if data.applicant.hhid.checkedIn}
          {format(data.applicant.hhid.checkedInAt, 'yyyy.MM.dd p')}
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        {/if}
      </div>
    </div>
    <div>
      {#if !data.applicant.hhid.checkedIn}
        <Button on:click={handleCheckIn}>Check In</Button>
      {/if}
    </div>
    <div class="space-y-8 mt-8">
      {#if data.applicant.hhid.checkedIn}
        {#each Object.keys(data.applicant.hhid.food).sort() as date}
          <div class="font-bold">
            {date}
          </div>
          {#each Object.keys(data.applicant.hhid.food[date]) as meal}
            <div>
              <Button
                on:click={() =>
                  handleMeal(date, meal, data.applicant.hhid.food[date][meal])}
                >{meal}: {data.applicant.hhid.food[date][meal]
                  ? 'already eaten'
                  : 'available'}</Button
              >
            </div>
          {/each}
        {/each}
      {/if}
    </div>
  {:else}
    <div>Did not send in a confirmation form.</div>
  {/if}
</div>
