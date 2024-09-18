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
    updateDoc,
    setDoc,
    doc,
    deleteDoc,
  } from 'firebase/firestore'
  import { db, user } from '$lib/client/firebase'
  import Card from '../Card.svelte'
  import { onMount } from 'svelte'
  import Loading from '../Loading.svelte'
  import { formatDate, formatDateLocal, toLocalISOString } from '$lib/utils'
  import { applicationsCollection } from '$lib/data/collections'
  import Select from '../Select.svelte'

  let className = ''
  export { className as class }

  let editSlot = ''
  let intervieweeNames: { name: string }[] = []
  let intervieweeOptions: Data.Application<"client">[]
  let interviewee: string 
  let onlyIncludeMyInterviews = true
  let onlyShowFutureSlots = true
  let showValidation = false
  let allInterviewSlots: Data.InterviewSlot[] = []
  let interviewSlotRequests: Data.SlotRequest[] = []
  let interviewSlotToAdd: Data.InterviewSlot = {
    date: '',
    id: '',
    interviewerName: '',
    intervieweeFirstName: '',
    intervieweeLastName: '',
    intervieweeEmail: '',
    intervieweeId: '',
    interviewerEmail: '',
    meetingLink: '',
    interviewSlotStatus: 'available',
  }
  let currentUser: Data.User.Store
  let loading = true

  async function getData() {
    const interviewSlots: Data.InterviewSlot[] = []
    const q = query(collection(db, 'instructorInterviewTimes'))
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      const interviewInfo = doc.data()
      interviewSlots.push({
        ...interviewInfo,
        date: toLocalISOString(new Date(interviewInfo.date.seconds * 1000)),
        id: doc.id,
      } as Data.InterviewSlot)
    })
    return interviewSlots
  }

  async function getTimeRequests() {
    const slotRequests: Data.SlotRequest[] = []
    const q = query(collection(db, 'interviewSlotRequests'))
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      const slotRequest = doc.data()
      slotRequests.push({
        date: new Date(slotRequest.date.seconds * 1000),
        id: doc.id.split('-')[0],
        firstName: slotRequest.firstName,
        lastName: slotRequest.lastName,
        email: slotRequest.email,
      } as Data.SlotRequest)
    })
    slotRequests.sort((a, b) => a.date.getTime() - b.date.getTime())
    return slotRequests
  }

  async function getInterviewees() {
    const names: { name: string }[] = []
    const options: Data.Application<"client">[] = []
    const q = query(collection(db, applicationsCollection))
        const querySnapshot = await getDocs(q)
          querySnapshot.forEach((doc) => {
            if(doc.data()) {
              const user = doc.data() as Data.Application<"client">
              if(user.meta.interview === false && user.meta.submitted === true) {
                names.push({
                  name: `${user.personal.firstName} ${user.personal.lastName}`,
                })
                options.push(user)
              }
            }
          })
    return { names, options }
  }

  $: if (interviewee) {
    const selectedInterviewee = intervieweeOptions.find(
      (option) => `${option.personal.firstName} ${option.personal.lastName}` === interviewee,
    )
    if(selectedInterviewee) {
      console.log(selectedInterviewee)
      const { personal: { email, firstName, lastName }, meta: { uid } } = selectedInterviewee
      interviewSlotToAdd.intervieweeId = uid
      interviewSlotToAdd.intervieweeEmail = email
      interviewSlotToAdd.intervieweeFirstName = firstName
      interviewSlotToAdd.intervieweeLastName = lastName
      interviewSlotToAdd.interviewSlotStatus = 'pending'
    }
    console.log(interviewSlotToAdd)
  }

  onMount(() => {
    return user.subscribe(async (user) => {
      if (user) {
        currentUser = user
        allInterviewSlots = await getData()
        interviewSlotRequests = await getTimeRequests()
        const intervieweeInfo = await getInterviewees()
        intervieweeNames = intervieweeInfo.names
        intervieweeOptions = intervieweeInfo.options
        interviewSlotToAdd.interviewerName =
        currentUser.object.displayName ?? ''
        interviewSlotToAdd.interviewerEmail = currentUser.object.email ?? ''
        loading = false
      }
    })
  })

  const addTime = async () => {
    if(interviewSlotToAdd.intervieweeId != '') {
      const confirmation = confirm(
        `Are you sure you want to assign ${interviewSlotToAdd.intervieweeFirstName} ${interviewSlotToAdd.intervieweeLastName} as the interviewee for this slot? An email will be sent to the interviewee confirming the interview has been scheduled.`,
      )
      if (!confirmation) {
        return
      }
    }
    const id = `${new Date(interviewSlotToAdd.date).getTime()}${
      currentUser.object.uid
    }`
    interviewSlotToAdd.id = id
    allInterviewSlots = [
      ...allInterviewSlots,
      {
        ...interviewSlotToAdd,
      },
    ]

    await setDoc(doc(db, 'instructorInterviewTimes', interviewSlotToAdd.id), {
      ...interviewSlotToAdd,
      date: new Date(interviewSlotToAdd.date),
    })
    if(interviewSlotToAdd.intervieweeId != '') {
      console.log(interviewSlotToAdd)
      await updateDoc(doc(db, applicationsCollection, interviewSlotToAdd.intervieweeId), {
        'meta.interview': true,
      })
      await fetch('/api/assignInterview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intervieweeEmail: interviewSlotToAdd.intervieweeEmail,
          firstName: interviewSlotToAdd.intervieweeFirstName,
          interviewer: interviewSlotToAdd.interviewerName,
          email: interviewSlotToAdd.interviewerEmail,
          link: interviewSlotToAdd.meetingLink,
          date: formatDateLocal(interviewSlotToAdd.date),
        }),
      })
    }
    alert.trigger('success', 'Interviewee assigned and email sent.')
    interviewSlotToAdd.meetingLink = ''
    interviewSlotToAdd.date = ''
    interviewSlotToAdd.intervieweeId = ''
    interviewSlotToAdd.intervieweeEmail = ''
    interviewSlotToAdd.intervieweeFirstName = ''
    interviewSlotToAdd.intervieweeLastName = ''
    interviewSlotToAdd.interviewSlotStatus = 'available'
    interviewee = ''
  }

  function handleClear() {
    interviewee = ''
    interviewSlotToAdd.intervieweeId = ''
    interviewSlotToAdd.intervieweeEmail = ''
    interviewSlotToAdd.intervieweeFirstName = ''
    interviewSlotToAdd.intervieweeLastName = ''
    interviewSlotToAdd.interviewSlotStatus = 'available'
    alert.trigger('success', 'Interviewee cleared.')
  }

  async function updateTime(interview: Data.InterviewSlot) {
    if (
      interview.interviewerEmail !== currentUser.object.email &&
      currentUser.profile.role !== 'admin'
    ) {
      alert.trigger(
        'error',
        'This interview does not belong to you and you are not an admin!',
      )
      return
    }
    setDoc(doc(db, 'instructorInterviewTimes', interview.id), {
      ...interview,
      date: new Date(interview.date),
    })
    alert.trigger('success', 'Timeslot updated successfully.')
    allInterviewSlots = await getData()
  }

  const deleteTime = async (interview: Data.InterviewSlot) => {
    if (
      interview.interviewerEmail !== currentUser.object.email &&
      currentUser.profile.role !== 'admin'
    ) {
      alert.trigger(
        'error',
        'This interview does not belong to you and you are not an admin!',
      )
    } else {
      deleteDoc(doc(db, 'instructorInterviewTimes', interview.id)).then(
        async () => {
          allInterviewSlots = await getData()
          alert.trigger('success', 'Timeslot successfully deleted.')
        },
      )
    }
  }
  
</script>

{#if loading}
  <Loading />
{:else}
  {#await allInterviewSlots then value}
  {#await interviewSlotRequests then interviewRequests}
  {#await intervieweeNames then intervieweeNames}
    <Card class="mb-2">
      <h2 class="font-bold">Interview Time Requests</h2>
      {#each interviewRequests as request}
        {#if intervieweeOptions.find((option) => option.meta.uid === request.id)?.meta.interview === false}
          {#if request.date > new Date()}
            <div class="flex items-center justify-between rounded-lg p-4 bg-blue-100">
              <p>{request.date}</p>
              <p>{request.firstName}{' '}{request.lastName}</p>
              <p>{request.email}</p>
            </div>
          {:else}
          <div class="flex items-center justify-between rounded-lg p-4 bg-red-100">
            <p>{request.date}</p>
            <p>{request.firstName}{' '}{request.lastName}</p>
            <p>{request.email}</p>
          </div>
          {/if}
        {/if}
      {/each}
    </Card>
    <Form class={clsx(showValidation && 'show-validation', className)}>
      <div class="right-2 items-center">
        <Card>
          <h2 class="font-bold">Add A Time Slot</h2>
          <Input
            type="datetime-local"
            bind:value={interviewSlotToAdd.date}
            label="Set Date (your local time)"
          />
          <Input
            type="text"
            bind:value={interviewSlotToAdd.meetingLink}
            label="Interview Meeting Link"
          />
          <div class="flex gap-4 items-end">
            <Select 
             bind:value={interviewee}
              label="Assign Interviewee (ONLY USE when fulfilling timeslots requested via email, or when asked to do so)"
             options={intervieweeNames}
            />
            <Button color = "red" class="h-fit" on:click={() => {handleClear()}}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></Button>
          </div>
          <div class="right-2 items-center">
            <Button
              color="blue"
              class="px-2 py-1 my-4"
              on:click={() => {
                addTime().then(() => {
                  alert.trigger('success', 'Timeslot added successfully.')
                })
              }}>Confirm Timeslot</Button
            >
          </div>
        </Card>

        <div class="flex gap-5 my-5">
          <Input
            type="checkbox"
            bind:value={onlyIncludeMyInterviews}
            label="Only include my interviews"
          />
          <Input
            type="checkbox"
            bind:value={onlyShowFutureSlots}
            label="Only show future interview slots"
          />
        </div>
      </div>

      {#each value as interview}
        {#if editSlot === interview.id}
          {#if ((onlyIncludeMyInterviews && interview.interviewerEmail === currentUser.object.email) || !onlyIncludeMyInterviews) && ((onlyShowFutureSlots && new Date(interview.date) > new Date()) || !onlyShowFutureSlots)}
            <Card>
              <Form
                class={clsx(showValidation && 'show-validation', className)}
                on:submit={() => updateTime(interview)}
              >
                <div style="padding:1rem;">
                  <div><b>Interviewer: </b>{interview.interviewerName}</div>
                  <Input
                    type="datetime-local"
                    bind:value={interview.date}
                    label="Edit Interview Meeting Time"
                  />
                  <Input
                    type="text"
                    bind:value={interview.meetingLink}
                    label="Edit Interview Meeting Link"
                  />
                  <div class="flex gap-5">
                    <div class="right-2 items-center">
                      <Button
                        color="blue"
                        class="px-2 py-1 my-4"
                        on:click={() => {
                          updateTime(interview)
                          editSlot = ''
                        }}>Save</Button
                      >
                    </div>
                    <div class="right-2 items-center">
                      <Button
                        color="blue"
                        class="px-2 py-1 my-4"
                        on:click={() => {
                          deleteTime(interview)
                          editSlot = ''
                        }}>Delete</Button
                      >
                    </div>
                  </div>
                </div>
              </Form>
            </Card>
          {/if}
        {:else if ((onlyIncludeMyInterviews && interview.interviewerEmail === currentUser.object.email) || !onlyIncludeMyInterviews) && ((onlyShowFutureSlots && new Date(interview.date) > new Date()) || !onlyShowFutureSlots)}
          <Card>
            <div class="my-1">
              <b>Interviewer:</b>
              {interview.interviewerName}
            </div>
            <div>
              <b>Time:</b>
              {formatDate(new Date(interview.date))}
            </div>
            <div>
              <b>Meeting Link:</b>
              <a href={interview.meetingLink} target="_blank">
                {interview.meetingLink}
              </a>
            </div>
            <!-- interview status -->
            <div>
              <b>Interview Status:</b>
              {interview.interviewSlotStatus}
            </div>

            {#if interview.intervieweeId !== ''}
              <div>
                <b>Interviewee:</b>
                {interview.intervieweeFirstName}
                {interview.intervieweeLastName}
              </div>
            {/if}

            {#if interview.interviewSlotStatus === 'available' && (interview.interviewerEmail === currentUser.object.email || currentUser.profile.role === 'admin')}
              <div>
                <Button
                  color="blue"
                  class="px-2 py-1 my-4"
                  on:click={() => (editSlot = interview.id)}>Edit</Button
                >
              </div>
            {/if}
          </Card>
        {/if}
      {/each}
    </Form>
  {/await}
  {/await}
  {/await}
{/if}
