<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { db } from '$lib/client/firebase'
  import Card from '$lib/components/Card.svelte'
  import Form from '$lib/components/Form.svelte'
  import Input from '$lib/components/Input.svelte'
  import Select from '$lib/components/Select.svelte'
  import Textarea from '$lib/components/Textarea.svelte'
  import { interviewAttendanceJson } from '$lib/data'
  import {
    applicationsCollection,
    decisionsCollection,
    semesterDatesDocument,
  } from '$lib/data/collections'
  import { alert } from '$lib/stores'
  import { formatDateShort, toLocalISOString } from '$lib/utils'
  import {
    type Timestamp,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
  } from 'firebase/firestore'
  import { cloneDeep } from 'lodash-es'
  import type { DecisionRequestBody } from '../../routes/api/decision/+server'
  import type { ScheduleInterviewRequestBody } from '../../routes/api/scheduleInterview/+server'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import EditApplicationForm from './forms/EditApplicationForm.svelte'

  export let dialogEl: Dialog
  export let id: string | undefined
  export let collection: string = applicationsCollection

  let loading = true
  let disabled = true
  let showInterviewForm = true
  let semesterStartDate = ''
  let semesterEndDate = ''
  let dbValues: Data.Application<'client'>
  const defaultValues: Data.Application<'client'> = {
    personal: {
      email: '',
      firstName: '',
      lastName: '',
      gender: '',
      race: [],
      phoneNumber: '',
      dateOfBirth: '',
    },
    academic: {
      school: '',
      graduationYear: '',
    },
    program: {
      courses: [],
      preferences: '',
      timeSlots: '',
      notAvailable: '',
      inPerson: false,
      numClasses: '',
      reason: '',
    },
    essay: {
      taughtBefore: false,
      academicBackground: '',
      teachingScenario: '',
      why: '',
    },
    agreements: {
      entireProgram: false,
      timeCommitment: false,
      submitting: false,
    },
    meta: {
      id: '',
      uid: '',
      decision: null,
      submitted: false,
      interview: false,
    },
    timestamps: {
      created: serverTimestamp() as Timestamp,
      updated: serverTimestamp() as Timestamp,
    },
  }

  const defaultInterview: Data.Interview = {
    date: '',
    interviewer: '',
    notes: '',
    type: 'interview',
    likelyDecision: 'likely no',
    attendance: 'Null',
    conversation: 0,
    conversationNotes: '',
    lastSemesterNotes: '',
    mockLessonExplanations: 0,
    mockLessonEngagement: 0,
    mockLessonPace: 0,
    mockLessonOverall: 0,
    mockLessonNotes: '',
    techNotes: '',
    teachingPreferences: '',
    availabilityNotes: '',
  }

  let interview: Data.Interview = cloneDeep(defaultInterview)
  let values: Data.Application<'client'> = cloneDeep(defaultValues)
  let decision: Data.Decision | null
  let formEl: HTMLFormElement

  $: if (id !== undefined) {
    ;(async () => {
      loading = true
      disabled = true
      values = cloneDeep(defaultValues)
      try {
        const applicationSnapshot = await getDoc(doc(db, collection, id))
        if (applicationSnapshot.exists()) {
          const data = applicationSnapshot.data() as Data.Application<'client'>
          values = cloneDeep(data)
          dbValues = cloneDeep(data)

          // Data populated in form child component
          if (data.meta.decision) {
            const decisionSnapshot = await getDoc(data.meta.decision)
            if (decisionSnapshot.exists()) {
              const dData = decisionSnapshot.data() as Data.Interview
              const {
                type,
                likelyDecision,
                notes,
                interviewer,
                attendance,
                conversation,
                conversationNotes,
                lastSemesterNotes,
                mockLessonEngagement,
                mockLessonExplanations,
                mockLessonNotes,
                techNotes,
                mockLessonPace,
                mockLessonOverall,
                teachingPreferences,
                availabilityNotes,
                date,
              } = dData
              decision = type ?? null
              interview.type = type ?? ''
              interview.likelyDecision = likelyDecision ?? null
              interview.notes = notes ?? ''
              interview.interviewer = interviewer ?? ''
              interview.attendance = attendance ?? ''
              interview.conversation = conversation ?? 0
              interview.conversationNotes = conversationNotes ?? ''
              interview.lastSemesterNotes = lastSemesterNotes ?? ''
              interview.mockLessonExplanations = mockLessonExplanations ?? 0
              interview.mockLessonNotes = mockLessonNotes ?? ''
              interview.techNotes = techNotes ?? ''
              interview.mockLessonPace = mockLessonPace ?? 0
              interview.mockLessonOverall = mockLessonOverall ?? 0
              interview.teachingPreferences = teachingPreferences ?? ''
              interview.mockLessonEngagement = mockLessonEngagement ?? 0
              interview.availabilityNotes = availabilityNotes ?? ''
              interview.date = toLocalISOString(new Date(date)) ?? ''
            } else {
              decision = null
              interview.likelyDecision = null
              interview = cloneDeep(defaultInterview)
            }
          } else {
            decision = null
            interview.likelyDecision = null
            interview = cloneDeep(defaultInterview)
          }
        } else {
          alert.trigger('error', 'Application not found.')
        }
      } catch (err: any) {
        console.error('Failed to load application:', err)
        alert.trigger('error', 'Failed to load application.')
      } finally {
        loading = false
      }
    })()
    ;(async () => {
      try {
        const dateSnap = await getDoc(
          doc(db, 'semesterDates', semesterDatesDocument),
        )
        if (dateSnap.exists()) {
          semesterStartDate = formatDateShort(
            new Date(dateSnap.data().classesStart),
          )
          semesterEndDate = formatDateShort(
            new Date(dateSnap.data().classesEnd),
          )
        }
      } catch (err) {
        console.error('Failed to load semester dates:', err)
      }
    })()
  }

  async function saveNotes() {
    const frozenId = id
    if (frozenId === undefined) return
    loading = true
    try {
      const {
        conversation,
        conversationNotes,
        mockLessonExplanations,
        mockLessonEngagement,
        mockLessonPace,
        mockLessonOverall,
        mockLessonNotes,
        teachingPreferences,
        availabilityNotes,
        notes,
        lastSemesterNotes,
        techNotes,
        date,
        interviewer,
        attendance,
      } = interview
      const decisionDocRef = doc(db, decisionsCollection, frozenId)
      await setDoc(
        decisionDocRef,
        {
          conversation,
          conversationNotes,
          mockLessonExplanations,
          mockLessonEngagement,
          mockLessonPace,
          mockLessonOverall,
          mockLessonNotes,
          teachingPreferences,
          availabilityNotes,
          notes,
          techNotes,
          lastSemesterNotes,
          date,
          interviewer,
          attendance,
        },
        { merge: true },
      )
      await updateDoc(doc(db, applicationsCollection, frozenId), {
        'meta.decision': decisionDocRef,
      })
      await invalidate('app:applications')
      alert.trigger('success', 'Notes updated successfully.')
    } catch (err: any) {
      alert.trigger('error', 'Something went wrong. Please try again.')
      console.error('Decisions update error:', err)
    } finally {
      loading = false
    }
  }

  async function handleLikelyDecision(
    newDecision: 'likely yes' | 'likely no' | 'likely waitlist' | null,
  ) {
    const frozenId = id
    if (frozenId === undefined) return
    loading = true
    try {
      const decisionDocRef = doc(db, decisionsCollection, frozenId)
      await setDoc(
        decisionDocRef,
        {
          likelyDecision: newDecision,
          type: decision ?? null,
        },
        { merge: true },
      )
      await updateDoc(doc(db, applicationsCollection, frozenId), {
        'meta.decision': decisionDocRef,
      })
      await invalidate('app:applications')
      alert.trigger('success', 'Decision updated successfully.')
      interview.likelyDecision = newDecision
    } catch (err: any) {
      alert.trigger('error', 'Something went wrong. Please try again.')
      console.error('Decision likely decision update error:', err)
    } finally {
      loading = false
    }
  }

  async function handleDecision(newDecision: Data.Decision) {
    let today = new Date()
    let weekDeadline = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    let interviewDeadline = formatDateShort(weekDeadline)

    try {
      const dueDate = await getDoc(
        doc(db, 'semesterDates', semesterDatesDocument),
      )
      if (dueDate.exists()) {
        interviewDeadline = formatDateShort(
          new Date(
            Math.min(
              weekDeadline.getTime(),
              new Date(dueDate.data().instructorOrientation).getTime(),
            ),
          ),
        )
      }
    } catch (err) {
      console.error('Failed to get semester dates:', err)
    }

    const confirmation = confirm(
      'Are you sure you want to update the decision? An email will be sent to the applicant, and you should not be changing the decision after this.',
    )
    if (!confirmation) {
      return
    }
    const frozenId = id
    if (frozenId === undefined) return
    loading = true
    try {
      interview.type = newDecision
      const {
        type,
        notes,
        interviewer,
        attendance,
        conversation,
        conversationNotes,
        lastSemesterNotes,
        mockLessonEngagement,
        mockLessonExplanations,
        mockLessonNotes,
        mockLessonPace,
        mockLessonOverall,
        teachingPreferences,
        availabilityNotes,
        techNotes,
        date,
        likelyDecision,
      } = interview
      const decisionDocRef = doc(db, decisionsCollection, frozenId)
      await setDoc(decisionDocRef, {
        type,
        likelyDecision,
        notes,
        interviewer,
        attendance,
        conversation,
        conversationNotes,
        lastSemesterNotes,
        mockLessonEngagement,
        mockLessonExplanations,
        mockLessonNotes,
        mockLessonPace,
        mockLessonOverall,
        teachingPreferences,
        techNotes,
        availabilityNotes,
        date,
      })
      await updateDoc(doc(db, applicationsCollection, frozenId), {
        'meta.decision': decisionDocRef,
      })
      await invalidate('app:applications')
      alert.trigger('success', 'Decision updated successfully.')
      decision = newDecision

      if (newDecision === 'interview') {
        const payload: ScheduleInterviewRequestBody = {
          email: values.personal.email,
          name: values.personal.firstName,
          deadline: interviewDeadline,
        }
        await fetch('/api/scheduleInterview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      } else {
        const payload: DecisionRequestBody = {
          decision: newDecision as
            | 'rejected'
            | 'waitlisted'
            | 'substitute'
            | 'accepted',
          email: values.personal.email,
          name: values.personal.firstName,
        }
        await fetch('/api/decision', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }
    } catch (err: any) {
      alert.trigger('error', 'Something went wrong. Please try again.')
      console.error('Decision update error:', err)
    } finally {
      loading = false
    }
  }

  function handleEdit() {
    disabled = false
  }
  function handleSaveChanges() {
    if (formEl) {
      formEl.requestSubmit()
    }
  }
  function handleDeleteChanges() {
    disabled = true
    values = cloneDeep(dbValues)
  }
</script>

<Dialog bind:this={dialogEl} size="full" alert>
  <svelte:fragment slot="title">Application</svelte:fragment>
  <div slot="description" class="w-full min-w-0">
    <Card>
      <div
        class="sticky top-2 z-50 flex flex-wrap items-center justify-between gap-3 p-3 md:p-3"
      >
        <fieldset class="flex flex-wrap items-center gap-2" disabled={loading}>
          {#if disabled}
            <Button
              color={!loading &&
              (interview.likelyDecision === null ||
                interview.likelyDecision === 'likely yes')
                ? 'green'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleLikelyDecision('likely yes')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Likely Yes</span></Button
            >
            <Button
              color={!loading &&
              (interview.likelyDecision === null ||
                interview.likelyDecision === 'likely waitlist')
                ? 'yellow'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleLikelyDecision('likely waitlist')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Likely Waitlist</span></Button
            >
            <Button
              color={!loading &&
              (interview.likelyDecision === null ||
                interview.likelyDecision === 'likely no')
                ? 'red'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleLikelyDecision('likely no')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Likely No</span></Button
            >
            <Button
              color={'gray'}
              class="flex items-center gap-1"
              on:click={() => handleLikelyDecision(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Clear Likely Decision</span></Button
            >
            <Button
              color={!loading && (decision === null || decision === 'interview')
                ? 'blue'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleDecision('interview')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="16"
                width="10"
                viewBox="0 0 320 512"
                ><path
                  d="M112 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm40 304V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V256.9L59.4 304.5c-9.1 15.1-28.8 20-43.9 10.9s-20-28.8-10.9-43.9l58.3-97c17.4-28.9 48.6-46.6 82.3-46.6h29.7c33.7 0 64.9 17.7 82.3 46.6l58.3 97c9.1 15.1 4.2 34.8-10.9 43.9s-34.8 4.2-43.9-10.9L232 256.9V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V352H152z"
                /></svg
              >
              <span>Interview</span></Button
            >
            <Button
              color={!loading && (decision === null || decision === 'accepted')
                ? 'green'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleDecision('accepted')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Accept</span></Button
            >
            <Button
              color={!loading &&
              (decision === null || decision === 'substitute')
                ? 'purple'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleDecision('substitute')}
              ><svg
                class="h-5 w-5 text-purple-300"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fill-rule="evenodd"
                  d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4.243a1 1 0 1 0-2 0V11H7.757a1 1 0 1 0 0 2H11v3.243a1 1 0 1 0 2 0V13h3.243a1 1 0 1 0 0-2H13V7.757Z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Substitute</span></Button
            >
            <Button
              color={!loading &&
              (decision === null || decision === 'waitlisted')
                ? 'yellow'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleDecision('waitlisted')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Waitlist</span></Button
            >

            <Button
              color={!loading && (decision === null || decision === 'rejected')
                ? 'red'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleDecision('rejected')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Reject</span></Button
            >
          {:else}
            <Button color="green" on:click={handleSaveChanges}
              >Save changes</Button
            >
            <Button color="red" on:click={handleDeleteChanges}
              >Cancel changes</Button
            >
          {/if}
        </fieldset>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            color="green"
            on:click={() => (showInterviewForm = !showInterviewForm)}
            >{showInterviewForm
              ? 'Close Interview Form'
              : 'Show Interview Form'}</Button
          >
          {#if disabled && !showInterviewForm}
            <Button on:click={handleEdit}>Edit</Button>
          {/if}
          <Button on:click={dialogEl.cancel}>Close</Button>
        </div>
      </div>
    </Card>
    <div class="mt-4 flex flex-wrap justify-center gap-4">
      <Card class="w-full min-w-[300px] flex-1 md:min-w-[450px]">
        <h2 class="my-4 text-2xl font-bold">Application Details</h2>
        <EditApplicationForm
          bind:formEl
          bind:disabled
          bind:loading
          bind:values
          bind:dbValues
          {id}
          {collection}
          {semesterStartDate}
          {semesterEndDate}
        />
      </Card>
      {#if showInterviewForm}
        <Card class="w-full min-w-[300px] flex-1 md:min-w-[450px]">
          <Form class="w-full">
            <div>
              <h2 class="my-4 text-2xl font-bold">
                Interview Guide & Evaluation Form
              </h2>
              <div class="mt-2 text-xs text-gray-500">
                Autosave is enabled for this browser
              </div>
              <Input
                type="datetime-local"
                bind:value={interview.date}
                label="Interview Date"
                required
              />
              <Input
                type="text"
                bind:value={interview.interviewer}
                label="Interviewer"
                required
              />
              <Select
                type="text"
                bind:value={interview.attendance}
                options={interviewAttendanceJson}
                label="Attendance"
                required
              />
              <ul class="my-4 list-disc rounded-lg bg-gray-100 p-4 px-8">
                <li>
                  Greet the candidate when they arrive & ask them how they are,
                  general conversational beginning. Try to be personable and
                  make them comfortable!
                </li>
                <li>
                  Introduce yourself: name, grade, school, and role at gbSTEM.”
                </li>
                <li>
                  If they are a new candidate: ask them to introduce themselves.
                  Ask them some questions about their interests. In addition to
                  getting to know them, we want to get a good idea of how they
                  interact!
                </li>
              </ul>
              <Input
                type="number"
                bind:value={interview.conversation}
                min="0"
                max="5"
                label="Please rate the candidate's friendliness and how well you think they would work with children on a 0 to 5 scale, 0 being the worst and 5 being the best. An average candidate should get a 2."
                required
              />
              <Textarea
                bind:value={interview.conversationNotes}
                label="Conversation Notes"
                optional
              />
              <div class="my-4 rounded-lg bg-gray-100 p-4">
                Clarify the subject they are applying to teach for (plus the
                level), clarify if there are other subjects that they could be
                considered for. Ask them to state their preferences, such as top
                3.
              </div>
              <Textarea
                bind:value={interview.teachingPreferences}
                label="What courses does the candidate want to teach?"
                required
              />
              <Input
                type="checkbox"
                bind:value={values.essay.taughtBefore}
                label="Have they taught for gbSTEM before? (This should be pre-set to the correct value, but if not simply check/uncheck the box as needed)."
              />
              {#if values.essay.taughtBefore}
                <div class="my-4 rounded-lg bg-gray-100 p-4">
                  <div>
                    Ask them about their experience as an instructor. For
                    example, “You're a returning instructor, correct? I would
                    like to take some time to talk about your experience last
                    semester. Could you give me an overview of the good, the
                    bad, anything that can be improved?”
                  </div>
                  <div class="font-bold">
                    Followup questions about their experience, as needed:
                  </div>
                  <ul class="list-disc px-8">
                    <li>
                      How did you find the curriculum? Were there any parts that
                      were too fast, too slow?
                    </li>
                    <li>
                      Did your students enjoy the class? Were they engaged, and
                      do you feel like they learned the content well?
                    </li>
                    <li>How was student attendance?</li>
                    <li>
                      Did you have any issues with technology, such as the Free
                      Zoom limit, WiFi, anything?
                    </li>
                    <li>
                      Did you feel supported by your track leadership if you had
                      questions, and informed about events?
                    </li>
                    <li>
                      How do you think you can improve as an instructor this
                      semester?
                    </li>
                  </ul>
                </div>
                <Textarea
                  bind:value={interview.lastSemesterNotes}
                  label="Last semester notes"
                  required
                />
              {:else}
                <div class="my-4 rounded-lg bg-gray-100 p-4">
                  <div class="font-bold">
                    Talk a little about the logistics of being an instructor.
                  </div>
                  <ul class="list-disc px-8">
                    <li>Classes meet twice a week; 60 min</li>
                    <li>
                      Most classes will take place through Microsoft Teams (link
                      will be provided for you). This is something new we are
                      trying this year, so we may fall back on Zoom/Google Meet
                      if needed.
                    </li>
                    <li>
                      Class sizes are usually between 5-15 students, but keep in
                      mind that not every student will be able to attend every
                      class session.
                    </li>
                    <li>
                      The curriculum for your classes will be provided to you
                      and accessible on the portal.
                    </li>
                    <li>
                      You'll be able to check in with the curriculum developer
                      and director for your course regularly to give feedback &
                      ask questions
                    </li>
                    <li>Do you have any questions?</li>
                  </ul>
                </div>
              {/if}
              <div class="my-4 rounded-lg bg-gray-100 p-4">
                <div>
                  Continue onto the mock lessons. Send the link for the
                  candidate’s top subject to teach. Allow each candidate 3
                  minutes to familiarize themselves with the lesson before
                  having them share their screen to present it to you. Note
                  their delivery, audience engagement, ability to speak slowly
                  and clearly, quality of explanations, as well as their
                  attitude.
                </div>
                <div class="mt-8 font-bold">Mock Lesson Materials</div>
                <div class="flex gap-4">
                  <Button
                    class="bg-gray-200"
                    href="https://docs.google.com/presentation/d/1dtv0qWFLNg3pjnlPCkm8nKEkEU_m5-dcLVMNEJmwFjk/edit#slide=id.g11b679f5bf6_0_9"
                    target="_blank">Math</Button
                  >
                  <Button
                    color="green"
                    href="https://docs.google.com/presentation/d/15aI-M8eEPKsFGpodmZ_oi4MWQKzTJ8Jrup4C7oFgSls/edit#slide=id.g2085bab7786_0_0"
                    target="_blank">Environmental Science</Button
                  >
                  <Button
                    color="yellow"
                    href="https://docs.google.com/presentation/d/1yf3ZOVCFgwILyihaG_sJonevv3cIiUMNvDlwJVarCto/edit#slide=id.g2085d4bbb38_0_4125"
                    target="_blank">Engineering</Button
                  >
                </div>
                <div class="mt-4 flex gap-4">
                  <Button
                    color="blue"
                    href="https://docs.google.com/document/d/1ruPmF-SRdWQ_LlilQz0PBFX1p7gDpfGZ1jVBmSpdgyI/edit#"
                    target="_blank">Scratch</Button
                  >
                  <Button
                    color="blue"
                    href="https://docs.google.com/document/d/1-Q40jjtKjt1dvX09qndC1ZEA7amiieAQgXF8qPDEvOE/edit"
                    target="_blank">Python 1</Button
                  >
                  <Button
                    color="blue"
                    href="https://docs.google.com/document/d/1LonFfZTQOwjz_QeZbRHb_RFVq_EntkVu64BBca2TVGw/edit"
                    target="_blank">Web Dev</Button
                  >
                </div>
              </div>
              <Input
                type="number"
                bind:value={interview.mockLessonExplanations}
                min="0"
                max="5"
                label="Please rate the clarity of the candidate's explanations of material in the mock lesson on a 0 to 5 scale, 0 being the worst and 5 being the best. An average candidate should get a 2."
                required
              />
              <Input
                type="number"
                bind:value={interview.mockLessonEngagement}
                min="0"
                max="5"
                label="Please rate the candidate's engagement with the audience (asking questions, relating to students, etc.) in the mock lesson on a 0 to 5 scale, 0 being the worst and 5 being the best. An average candidate should get a 2."
                required
              />
              <Input
                type="number"
                bind:value={interview.mockLessonPace}
                min="0"
                max="5"
                label="Please rate the pace of the mock lesson on a 0 to 5 scale, 0 being the worst and 5 being the best. An average candidate should get a 2."
                required
              />
              <Input
                type="number"
                bind:value={interview.mockLessonOverall}
                min="0"
                max="5"
                label="Please rate the overall quality of the mock lesson on a 0 to 5 scale, 0 being the worst and 5 being the best. An average candidate should get a 2."
                required
              />
              <Textarea
                bind:value={interview.mockLessonNotes}
                label="Mock lesson notes. What went well? What could be improved? If there was a low pacing score, why -- too fast or too slow?"
                required
              />
              <Textarea
                bind:value={interview.techNotes}
                label="Any tech or other issues that could hinder their ability to be a good instructor?"
                required
              />
              <div class="my-4 rounded-lg bg-gray-100 p-4">
                <div class="font-bold">Continue:</div>
                <ul class="list-disc px-8">
                  <li>
                    Outline that classes meet twice a week from {semesterStartDate}
                    to {semesterEndDate}. Ask if they have any known scheduling
                    conflicts, days they will have to miss, or days of the week
                    they can't make.
                  </li>
                  <li>
                    Remind them that, as the teacher, they are obviously
                    required to go to all classes and show up on time, and they
                    should also prepare for the class before the class happens
                    by looking through the curriculum.
                  </li>
                  <li>
                    Additionally, emphasize that we expect them to respond to
                    emails and slack messages within 24 hours.
                  </li>
                  <li>
                    Ask if they are meet all of the above expectations, and if
                    there is anything we can help them with to make sure they
                    are able to do all this.”
                  </li>
                </ul>
              </div>
              <Textarea
                bind:value={interview.availabilityNotes}
                label="Availability notes. When is the candidate not available? Are there any potential concerns with the candidate's availability?"
                required
              />
              <div class="my-4 rounded-lg bg-gray-100 p-4">
                <div>
                  Thank them for speaking with you, and let them know that they
                  can reach us at contact@gbstem.org. Additionally, tell them
                  that if they are accepted, instructor orientation will be on
                  Sept. 20th, so they should mark their calendars for that.
                </div>
                <div>
                  Mark <strong>Likely Yes</strong> or <strong>Likely No</strong>
                  depending on your decision recommendation. Be careful NOT to click
                  "Interview", "Accept", "Waitlist", or "Reject".
                </div>
              </div>
              <Textarea
                bind:value={interview.notes}
                label="Please briefly summarize the reasoning behind your recommendation."
                required
              />
              <div class="my-2 mt-4 font-bold">
                Once you have completed this form, click "Save Notes" to submit
                it!
              </div>
              <div class="flex justify-start gap-4">
                <Button color="green" on:click={saveNotes}>Save Notes</Button>
                <Button color="red" on:click={() => (showInterviewForm = false)}
                  >Close Interview Form</Button
                >
              </div>
            </div>
          </Form>
        </Card>
      {/if}
    </div>
  </div>
</Dialog>
