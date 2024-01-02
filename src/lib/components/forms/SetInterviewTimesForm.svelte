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
  let allInterviewSlots: Data.InterviewSlot[] = []
  let originalDateSlots = []
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

  let startId = allInterviewSlots.length + 1
  async function getData() {
    const q = query(collection(db, 'instructorInterviewTimes'))
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      const json = doc.data()
      if ($user) {
        let include = true
        if ($user.object.displayName && $user.object.email) {
          interviewer.interviewerFirstName = $user.object.displayName.split(' ')[0];
          interviewer.interviewerLastName = $user.object.displayName.split(' ')[1];
          interviewer.interviewerEmail = $user.object.email;
          for (let intervalSlot of allInterviewSlots) {
            if (intervalSlot.id === doc.id) {
              include = false;
            }
            if(Number(intervalSlot.id) > startId) {
              startId = Number(intervalSlot.id) + 1;
            }
          }
          if (json['interviewSlotStatus'] === 'available' && include) {
            allInterviewSlots.push({
              date: json['date'],
              id: doc.id,
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
    console.log(allInterviewSlots);
    return allInterviewSlots;
  }

  async function clearData() {
    allInterviewSlots = []
    return allInterviewSlots
  }

  let data = clearData()
  data = getData()

  function handleSubmit() {
    allInterviewSlots.forEach((interview) =>
      setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview),
    )
  }

  function addTime(timeSlot: Data.TimeSlot) {
    startId = startId + 1;
        allInterviewSlots.push({
          date: timeSlot.date.toString(),
          id: startId.toString(),
          interviewerFirstName: interviewer.interviewerFirstName,
          interviewerLastName: interviewer.interviewerLastName,
          intervieweeFirstName: '',
          intervieweeLastName: '',
          intervieweeId: '',
          interviewerEmail: interviewer.interviewerEmail,
          interviewLink: timeSlot.link,
          interviewSlotStatus: 'available',
        })
        data = getData()
      
        console.log(allInterviewSlots)
      allInterviewSlots.forEach((interview) =>
      setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview)
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
          ).toUTCString()
          startId = startId + 1
          allInterviewSlots.push({
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
    allInterviewSlots.forEach((interview) =>
      setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview),
    )
  }

  function updateTime(interview: Data.InterviewSlot) {
    setDoc(doc(db, 'instructorInterviewTimes', interview.id), interview)
    alert.trigger('success', 'Timeslot updated successfully.')
  }

  async function deleteTime(interview: Data.InterviewSlot) {
    if(interview.interviewerEmail !== interviewer.interviewerEmail) {
      alert.trigger('error', 'This interview does not belong to you!');
    } else {
      await deleteDoc(doc(db, 'instructorInterviewTimes', interview.id)).then(
      () => {
        data = clearData()
        data = getData()
        alert.trigger('success', 'Timeslot successfully deleted.')
      },
    )
    }
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
        <Form
          class={clsx(showValidation && 'show-validation', className)}
          on:submit={() => updateTime(interview)}
        >
          <div style="padding:1rem;">
            <div><b>Interviewer: </b>{interview.interviewerFirstName}</div>
            <Input
              type="datetime-local"
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
                <div class="my-1"><b>Interviewer:</b> {interview.interviewerFirstName}</div>
                <b>Time:</b> {new Date(interview.date).toLocaleString()}
        </Card>
        {/if}

       
        {/if}
      {/each}   
    </Form>
{/await}
