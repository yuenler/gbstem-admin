<script lang="ts">
  import { user } from '$lib/client/firebase'
  import CheckboxInput from '$lib/components/CheckboxInput.svelte'
  import DateTimeInput from '$lib/components/DateTimeInput.svelte'
  import Form from '$lib/components/Form.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import {
    canUserModifySlot,
    resetInterviewSlotToAdd,
  } from '$lib/helpers/setInterviewTimes'
  import { interviewService } from '$lib/services/interviewService'
  import { alert } from '$lib/stores'
  import { cn, formatDate, formatDateLocal } from '$lib/utils'
  import { onMount } from 'svelte'
  import Button from '../Button.svelte'
  import Card from '../Card.svelte'
  import Loading from '../Loading.svelte'
  import Select from '../Select.svelte'
  import { getInterviewSlotDefaults } from './schemas'

  interface Props {
    class?: string
  }

  let { class: className = '' }: Props = $props()

  let editSlot = $state('')
  let intervieweeNames: { name: string }[] = $state([])
  let intervieweeOptions: Data.Application<'client'>[] = $state([])
  let interviewee: string = $state('')
  let onlyIncludeMyInterviews = $state(true)
  let onlyShowFutureSlots = $state(true)
  let showValidation = false
  let allInterviewSlots: Data.InterviewSlot[] = $state([])
  let interviewSlotRequests: Data.SlotRequest[] = $state([])
  let interviewSlotToAdd: Data.InterviewSlot = $state(
    getInterviewSlotDefaults(),
  )
  let currentUser: Data.User.Store | undefined = $state()
  let loading = $state(true)
  let loadError = $state<string | null>(null)

  async function getData() {
    return interviewService.fetchInterviewSlots()
  }

  async function getTimeRequests() {
    return interviewService.fetchSlotRequests()
  }

  async function getInterviewees() {
    return interviewService.fetchEligibleInterviewees()
  }

  let selectedIntervieweeDocId = $state('')
  $effect(() => {
    if (interviewee) {
      const selectedInterviewee = intervieweeOptions.find(
        (option) =>
          `${option.personal.firstName} ${option.personal.lastName}` ===
          interviewee,
      )
      if (selectedInterviewee) {
        const {
          personal: { email, firstName, lastName },
          meta: { uid },
        } = selectedInterviewee
        selectedIntervieweeDocId = (selectedInterviewee as any).docId || ''
        interviewSlotToAdd.intervieweeId = uid
        interviewSlotToAdd.intervieweeEmail = email
        interviewSlotToAdd.intervieweeFirstName = firstName
        interviewSlotToAdd.intervieweeLastName = lastName
        interviewSlotToAdd.interviewSlotStatus = 'pending'
      }
    }
  })

  onMount(() => {
    return user.subscribe(async (user) => {
      if (user) {
        try {
          currentUser = user
          allInterviewSlots = await getData()
          interviewSlotRequests = await getTimeRequests()
          const intervieweeInfo = await getInterviewees()
          intervieweeNames = intervieweeInfo.names
          intervieweeOptions = intervieweeInfo.options
          interviewSlotToAdd.interviewerName =
            currentUser.object.displayName ?? ''
          interviewSlotToAdd.interviewerEmail = currentUser.object.email ?? ''
          loadError = null
        } catch (err: any) {
          console.error('Failed to load interview slots:', err)
          loadError = err.message || 'Failed to load interview data.'
        } finally {
          loading = false
        }
      }
    })
  })

  const addTime = async () => {
    if (interviewSlotToAdd.intervieweeId != '') {
      const confirmation = confirm(
        `Are you sure you want to assign ${interviewSlotToAdd.intervieweeFirstName} ${interviewSlotToAdd.intervieweeLastName} as the interviewee for this slot? An email will be sent to the interviewee confirming the interview has been scheduled.`,
      )
      if (!confirmation) {
        return
      }
    }

    try {
      const addedSlot = await interviewService.createOrAssignInterviewSlot(
        interviewSlotToAdd,
        selectedIntervieweeDocId,
        currentUser?.object?.uid,
      )
      allInterviewSlots = [...allInterviewSlots, addedSlot]
      if (interviewSlotToAdd.intervieweeId != '') {
        alert.trigger('success', 'Interviewee assigned and email sent.')
      } else {
        alert.trigger('success', 'Timeslot added successfully.')
      }
    } catch (err: any) {
      console.error('Add timeslot error:', err)
      alert.trigger('error', 'Failed to add timeslot.')
    }

    interviewSlotToAdd = resetInterviewSlotToAdd(
      currentUser?.object?.displayName ?? '',
      currentUser?.object?.email ?? '',
    )
    interviewee = ''
    allInterviewSlots = await getData()
  }

  function handleClear() {
    interviewee = ''
    interviewSlotToAdd = resetInterviewSlotToAdd(
      interviewSlotToAdd.interviewerName,
      interviewSlotToAdd.interviewerEmail,
    )
    alert.trigger('success', 'Interviewee cleared.')
  }

  async function updateTime(interview: Data.InterviewSlot) {
    if (
      !canUserModifySlot(
        interview.interviewerEmail,
        currentUser?.object?.email,
        currentUser?.profile?.role,
      )
    ) {
      alert.trigger(
        'error',
        'This interview does not belong to you and you are not an admin!',
      )
      return
    }
    try {
      await interviewService.updateInterviewSlot(interview)
      alert.trigger('success', 'Timeslot updated successfully.')
      allInterviewSlots = await getData()
    } catch (err: any) {
      console.error('Update timeslot error:', err)
      alert.trigger('error', 'Failed to update timeslot.')
    }
  }

  const deleteTime = async (interview: Data.InterviewSlot) => {
    if (
      !canUserModifySlot(
        interview.interviewerEmail,
        currentUser?.object?.email,
        currentUser?.profile?.role,
      )
    ) {
      alert.trigger(
        'error',
        'This interview does not belong to you and you are not an admin!',
      )
      return
    }
    try {
      await interviewService.deleteInterviewSlot(interview.id)
      allInterviewSlots = await getData()
      alert.trigger('success', 'Timeslot successfully deleted.')
    } catch (err: any) {
      console.error('Delete timeslot error:', err)
      alert.trigger('error', 'Failed to delete timeslot.')
    }
  }
</script>

<svelte:boundary>
  {#snippet failed(err, reset)}
    <div class="rounded-lg bg-red-100 p-4 text-red-700">
      <p class="font-bold">
        An unexpected error occurred rendering interview timeslots:
      </p>
      <p class="mt-1">{err instanceof Error ? err.message : String(err)}</p>
      <Button color="red" class="mt-3 px-3 py-1" onclick={reset}>Retry</Button>
    </div>
  {/snippet}

  {#if loading}
    <Loading />
  {:else if loadError}
    <div class="rounded-lg bg-red-100 p-4 text-red-700">
      <p class="font-bold">Error loading interview timeslots:</p>
      <p class="mt-1">{loadError}</p>
    </div>
  {:else}
    {#await allInterviewSlots then value}
      {#await interviewSlotRequests then interviewRequests}
        {#await intervieweeNames then intervieweeNames}
          <Form class={cn(showValidation && 'show-validation', className)}>
            <div class="right-2 items-center">
              <Card class="mb-4">
                <h2 class="font-bold">Interview Time Requests</h2>
                {#each interviewRequests as request (request.id)}
                  {#if intervieweeOptions.find((option) => option.meta.uid === (request.uid || request.id.replace(/-\d{4}-\d{2}-\d{2}.*$/, '')))?.meta.interview === false}
                    {#if request.date > new Date()}
                      <div
                        class="mt-2 flex items-center justify-between rounded-lg bg-blue-100 p-4"
                      >
                        <p>{formatDateLocal(request.date)}</p>
                        <p>{request.firstName} {request.lastName}</p>
                        <p>{request.email}</p>
                      </div>
                    {:else if request.date > new Date(new Date().setDate(new Date().getDate() - 30))}
                      <div
                        class="mt-2 flex items-center justify-between rounded-lg bg-red-100 p-4"
                      >
                        <p>{formatDateLocal(request.date)}</p>
                        <p>{request.firstName} {request.lastName}</p>
                        <p>{request.email}</p>
                      </div>
                    {/if}
                  {/if}
                {/each}
              </Card>
              <Card>
                <h2 class="font-bold">Add A Time Slot</h2>
                <DateTimeInput
                  bind:value={interviewSlotToAdd.date}
                  label="Set Date (your local time)"
                />
                <TextInput
                  bind:value={interviewSlotToAdd.meetingLink}
                  label="Interview Meeting Link"
                />
                <div class="flex items-end gap-4">
                  <Select
                    bind:value={interviewee}
                    label="Assign Interviewee (ONLY USE when fulfilling that person's interview time request)"
                    options={intervieweeNames}
                  />
                  <Button
                    color="red"
                    class="h-fit"
                    onclick={() => {
                      handleClear()
                    }}
                    ><svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#000000"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polyline points="3 6 5 6 21 6"></polyline><path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      ></path><line x1="10" y1="11" x2="10" y2="17"></line><line
                        x1="14"
                        y1="11"
                        x2="14"
                        y2="17"
                      ></line></svg
                    ></Button
                  >
                </div>
                <div class="right-2 items-center">
                  <Button color="blue" class="my-4 px-2 py-1" onclick={addTime}
                    >Confirm Timeslot</Button
                  >
                </div>
              </Card>

              <div class="my-5 flex gap-5">
                <CheckboxInput
                  bind:value={onlyIncludeMyInterviews}
                  label="Only include my interviews"
                />
                <CheckboxInput
                  bind:value={onlyShowFutureSlots}
                  label="Only show future interview slots"
                />
              </div>
            </div>

            {#each value as interview (interview.id)}
              {#if editSlot === interview.id}
                {#if ((onlyIncludeMyInterviews && interview.interviewerEmail === currentUser?.object?.email) || !onlyIncludeMyInterviews) && ((onlyShowFutureSlots && new Date(interview.date) > new Date()) || !onlyShowFutureSlots)}
                  <Card>
                    <Form
                      class={cn(showValidation && 'show-validation', className)}
                      onSubmit={() => updateTime(interview)}
                    >
                      <div style="padding:1rem;">
                        <div>
                          <b>Interviewer: </b>{interview.interviewerName}
                        </div>
                        <DateTimeInput
                          bind:value={interview.date}
                          label="Edit Interview Meeting Time"
                        />
                        <TextInput
                          bind:value={interview.meetingLink}
                          label="Edit Interview Meeting Link"
                        />
                        <div class="flex gap-5">
                          <div class="right-2 items-center">
                            <Button
                              color="blue"
                              class="my-4 px-2 py-1"
                              onclick={() => {
                                updateTime(interview)
                                editSlot = ''
                              }}>Save</Button
                            >
                          </div>
                          <div class="right-2 items-center">
                            <Button
                              color="blue"
                              class="my-4 px-2 py-1"
                              onclick={() => {
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
              {:else if ((onlyIncludeMyInterviews && interview.interviewerEmail === currentUser?.object?.email) || !onlyIncludeMyInterviews) && ((onlyShowFutureSlots && new Date(interview.date) > new Date()) || !onlyShowFutureSlots)}
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

                  {#if (interview.interviewSlotStatus === 'available' || interview.interviewSlotStatus === 'pending') && (interview.interviewerEmail === currentUser?.object?.email || currentUser?.profile?.role === 'admin')}
                    <div>
                      <Button
                        color="blue"
                        class="my-4 px-2 py-1"
                        onclick={() => (editSlot = interview.id)}>Edit</Button
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
</svelte:boundary>
