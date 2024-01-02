<script lang="ts">
  import Input from '$lib/components/Input.svelte'
  import clsx from 'clsx'
  import { alert } from '$lib/stores'
  import Form from '$lib/components/Form.svelte'
  import Button from '../Button.svelte'
  import {
    query,
    collection,
    getDocs,
    setDoc,
    doc,
    deleteDoc,
  } from 'firebase/firestore'
  import { db, user } from '$lib/client/firebase'
  import Card from '../Card.svelte'

  let className = ''
  export { className as class }

  let editSlots = false
  let includeAllSlots = true
  let showValidation = false
  let values: Data.InterviewSlot[] = []
  let timeRanges: Data.TimeRange = {
    start: 0,
    end: 0,
    timegap: 30,
    date: new Date(0),
    link: '',
  }
  let time: Data.TimeSlot = {
    date: new Date(0),
    time: 0,
    link: '',
  }
  let interviewer = {
    interviewerFirstName: '',
    interviewerLastName: '',
    interviewerEmail:'',
  }

  let startId = values.length + 1
  async function getData() {
    const q = query(collection(db, 'instructorInterviewTimes'))
    const querySnapshot = await getDocs(q)
    startId = querySnapshot.size + 1
    querySnapshot.forEach((doc) => {
      const json = doc.data()
      const id = doc.id
      const date = json['date']
      const interviewDate = new Date(date['seconds'] * 1000)
      if ($user) {
        let include = true
        if ($user.object.displayName && $user.object.email) {
          interviewer.interviewerFirstName = $user.object.displayName.split(' ')[0];
          interviewer.interviewerLastName = $user.object.displayName.split(' ')[1];
          interviewer.interviewerEmail = $user.object.email;
          for (let element of values) {
            if (element.id === id) {
              include = false;
            }
          }
          if (json['interviewSlotStatus'] === 'available' && include) {
            values.push({
              date: interviewDate,
              id: id,
              interviewerFirstName: json['interviewerFirstName'],
              interviewerLastName: json['intervieweeLastName'],
              intervieweeFirstName: json['intervieweeFirstName'],
              intervieweeLastName: json['intervieweeLastName'],
              intervieweeId: json['intervieweeId'],
              interviewerEmail: json['interviewerEmail'],
              interviewLink: json['interviewLink'],
              interviewSlotStatus: json['interviewSlotStatus'],
            })
          }
        }
      }
    })
    console.log(startId);
    console.log($user?.object.email);
    console.log(values);
    return values;
  }

  async function clearData() {
    values = []
    return values
  }

  let data = clearData()
  data = getData()

  function handleSubmit() {
    values.forEach((interview) =>
      setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview),
    )
  }

  function addTime(timeSlot: Data.TimeSlot) {
    startId = startId + 1
    if ($user) {
      if ($user.object.displayName && $user.object.email) {
        const date = new Date(timeSlot.date.toString())
        const time =
          Math.floor(
            Number(timeSlot.time.toLocaleString().split(':')[0]) * 60,
          ) + Number(timeSlot.time.toLocaleString().split(':')[1])
        const slot = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getUTCDate(),
          time / 60,
          time % 60,
        )
        values.push({
          date: slot,
          id: startId.toString(),
          interviewerFirstName: $user.object.displayName.split(' ')[0],
          interviewerLastName: $user.object.displayName.split(' ')[0],
          intervieweeFirstName: '',
          intervieweeLastName: '',
          intervieweeId: '',
          interviewerEmail: $user.object.email,
          interviewLink: timeSlot.link,
          interviewSlotStatus: 'available',
        })
        data = getData()
      }
    }
    values.forEach((interview) =>
      setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview),
    )
  }

  function addRange(timeRange: Data.TimeRange) {
    startId = startId + 1
    if ($user) {
      if ($user.object.displayName && $user.object.email) {
        const date = new Date(timeRange.date.toString())
        const start =
          Math.floor(
            Number(timeRange.start.toLocaleString().split(':')[0]) * 60,
          ) + Number(timeRange.start.toLocaleString().split(':')[1])
        const end =
          Math.floor(
            Number(timeRange.end.toLocaleString().split(':')[0]) * 60,
          ) + Number(timeRange.end.toLocaleString().split(':')[1])
        if (end - start < 0) {
          alert.trigger('error', 'Start time cannot be earlier than end time.')
        }
        for (let t = start; t < end; t += timeRange.timegap) {
          const intervalSlot = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getUTCDate(),
            t / 60,
            t % 60,
          )
          startId = startId + 1
          values.push({
            date: intervalSlot,
            id: startId.toString(),
            interviewerFirstName: $user.object.displayName.split(' ')[0],
            interviewerLastName: $user.object.displayName.split(' ')[0],
            intervieweeFirstName: '',
            intervieweeLastName: '',
            intervieweeId: '',
            interviewerEmail: $user.object.email,
            interviewLink: timeRange.link,
            interviewSlotStatus: 'available',
          })
        }

        data = getData()
      }
    }
    values.forEach((interview) =>
      setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview),
    )
  }

  function toggleTimeSlotsFilter() {
    console.log(includeAllSlots)
    data = getData();
  }

  function updateTime(interview: Data.InterviewSlot) {
    setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview)
    alert.trigger('success', 'Timeslot updated successfully.')
  }

  async function deleteTime(interview: Data.InterviewSlot) {
    await deleteDoc(doc(db, 'instructorInterviewTimes', interview.id)).then(
      () => {
        data = clearData()
        data = getData()
        alert.trigger('success', 'Timeslot successfully deleted.')
      },
    )
  }

  function toLocalISOString(date: Date) {
    const pad = (number: number) => (number < 10 ? '0' + number : number)

    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1) // JavaScript months are 0-indexed.
    const day = pad(date.getDate())
    const hour = pad(date.getHours())
    const minute = pad(date.getMinutes())

    return `${year}-${month}-${day}T${hour}:${minute}`
  }

    function formatDate(date: string): string {
    const dateObj = new Date(date)
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
    return dateObj.toLocaleString(undefined, options)
  }
  
</script>

{#await data then value}
  <Form
    class={clsx(showValidation && 'show-validation', className)}
    on:submit={handleSubmit}
  >
    <div class="right-2 items-center">
      <Card>
        <h2 class="font-bold">Add A Time Slot</h2>
        <Input type="datetime-local" bind:value={time.date} label="Set Date" />
        <Input type="text" bind:value={time.link} label="Interview Meeting Link" />
        <div class="right-2 items-center">
          <Button
            color="blue"
            class="px-2 py-1 my-4"
            on:click={() => addTime(time)}>Confirm Timeslot</Button
          >
        </div>
      </Card>

      <div class="flex gap-5 my-5">
      <Input type="checkbox" bind:value={editSlots} label="Edit Slots"/>
      <Input type="checkbox" bind:value={includeAllSlots} label="Include All Interview Time Slots"/>
    </div>
      <!-- <Card>
        <h2 class="font-bold">Add Time Range</h2>
        <Input type="date" bind:value={timeRanges.date} label="Set Date" />
        <Input
          type="time"
          bind:value={timeRanges.start}
          label="Time Range Start"
        />
        <Input type="time" bind:value={timeRanges.end} label="Time Range End" />
        <Input
          type="number"
          bind:value={timeRanges.timegap}
          label="Range Between Slots (30 min advised)"
        />
        <Input type="text" bind:value={timeRanges.link} label="Interview Meeting Link" />
        <div class="right-2 items-center">
          <Button
            color="blue"
            class="px-2 py-1 my-4"
            on:click={() => addRange(timeRanges)}>Confirm Range</Button
          >
        </div>
      </Card> -->
    </div>

      {#each value as interview}
      {#if editSlots}
      {#if (!includeAllSlots && interview.interviewerEmail === interviewer.interviewerEmail) || includeAllSlots}
      <Card>
        <span class="font-bold">Edit Interview Slot</span>
        <Form
          class={clsx(showValidation && 'show-validation', className)}
          on:submit={() => updateTime(interview)}
        >
          <hr style="margin-top:1rem;" />
          <div style="padding:1rem;">
            <Input
              type="text"
              bind:value={interview.date}
              label="Edit Interview Meeting Time"
            />
            <Input
              type="text"
              bind:value={interview.interviewLink}
              label="Edit Interview Meeting Link"
            />
            <div class="flex gap-5">
              <div class="right-2 items-center">
                <Button
                  color="blue"
                  class="px-2 py-1 my-4"
                  on:click={() => updateTime(interview)}>Save</Button
                >
              </div>
              <div class="right-2 items-center">
                <Button
                  color="blue"
                  class="px-2 py-1 my-4"
                  on:click={() => deleteTime(interview)}>Delete</Button
                >
              </div>
            </div>
          </div>
        </Form>
      </Card> 
      {/if}
        {:else}
        {#if (!includeAllSlots && interview.interviewerEmail === interviewer.interviewerEmail) || includeAllSlots}
        <Card>
          <h2 class="font-bold">Interview Slot</h2>
              <div style="padding:1rem;">
                {interview.date}
              </div>
        </Card>
        {/if}

       
        {/if}
      {/each}   
    </Form>
{/await}
