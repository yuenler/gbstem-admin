<script lang="ts">
  import { db } from '$lib/client/firebase'
  import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
  import type { PageData } from './$types'
  import Button from '$lib/components/Button.svelte'
  import { format } from 'date-fns'
  import { invalidateAll } from '$app/navigation'
  import { alert } from '$lib/stores'

  interface Props {
    data: PageData
  }

  let { data }: Props = $props()

  async function handleCheckIn() {
    const hhidRef = doc(db, 'hhids', data.applicant.user.hhid)
    try {
      await updateDoc(hhidRef, {
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
      })
      await invalidateAll()
      alert.trigger('success', 'Checked in successfully.')
    } catch (err: any) {
      console.error('Check in failed:', err)
      alert.trigger('error', `Check in failed: ${err.message || err}`)
    }
  }

  async function handleMeal(date: string, meal: string, state: boolean) {
    try {
      await updateDoc(doc(db, 'hhids', data.applicant.user.hhid), {
        [`food.${date}.${meal}`]: !state,
      })
      await invalidateAll()
    } catch (err: any) {
      console.error('Meal status update failed:', err)
      alert.trigger('error', `Meal status update failed: ${err.message || err}`)
    }
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
            class="h-6 w-6"
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
    <div class="mt-8 space-y-8">
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
