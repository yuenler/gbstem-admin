<script lang="ts">
  import {
    type Timestamp,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
  } from 'firebase/firestore'
  import Input from '$lib/components/Input.svelte'
  import Select from '$lib/components/Select.svelte'
  import Textarea from '$lib/components/Textarea.svelte'
  import {
    gendersJson,
    reasonsJson,
    raceJson,
    coursesJson,
    timeSlotsJson,
    classesPerWeekJson,
  } from '$lib/data'
  import Card from '$lib/components/Card.svelte'
  import Form from '$lib/components/Form.svelte'
  import { db } from '$lib/client/firebase'
  import Field from '$lib/components/Field.svelte'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import { alert } from '$lib/stores'
  import { cloneDeep } from 'lodash-es'
  import type { FirebaseError } from 'firebase/app'
  import { invalidate } from '$app/navigation'
    import { formatDateShort } from '$lib/utils'
    import { applicationsCollection, decisionsCollection, semesterDatesDocument } from '$lib/data/collections'

  export let dialogEl: Dialog
  export let id: string | undefined

  let loading = true
  let disabled = true
  let showInterviewForm = false
  // $: {
  //   if (loading) {
  //     nProgress.start()
  //   } else {
  //     nProgress.done()
  //   }
  // }
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
    likelyDecision: 'likely waitlist',
    attendance: 'noShow',
    conversation: 0,
    conversationNotes: '',
    lastSemesterNotes: '',
    mockLessonExplanations: 0,
    mockLessonEngagement: 0,
    mockLessonPace: 0,
    mockLessonOverall: 0,
    mockLessonNotes: '',
    teachingPreferences: '',
    availabilityNotes: '',
  }

  let interview: Data.Interview = cloneDeep(defaultInterview)

  let values: Data.Application<'client'> = cloneDeep(defaultValues)
  let decision: Data.Decision | null
  let likelyDecision: 'likely yes' | 'likely no' | 'likely waitlist' | null
  let notes = ''
  $: if (id !== undefined) {
    loading = true
    disabled = true
    values = cloneDeep(defaultValues)
    getDoc(doc(db, applicationsCollection, id)).then((applicationSnapshot) => {
      const data = applicationSnapshot.data() as Data.Application<'client'>
      if (applicationSnapshot.exists()) {
        values = cloneDeep(data)
        dbValues = cloneDeep(data)
        if (data.meta.decision) {
          getDoc(data.meta.decision).then((decisionSnapshot) => {
            const data = decisionSnapshot.data() as Data.Interview
            if (decisionSnapshot.exists()) {
              const { type, likelyDecision, notes, interviewer, attendance, conversation, conversationNotes, lastSemesterNotes, mockLessonEngagement, mockLessonExplanations, mockLessonNotes, mockLessonPace, mockLessonOverall, teachingPreferences, availabilityNotes } = data
              decision = type ?? null
              interview.likelyDecision = likelyDecision ?? null
              interview.notes = notes ?? ''
              interview.interviewer = interviewer ?? ''
              interview.attendance = attendance ?? ''
              interview.conversation = conversation ?? 0
              interview.conversationNotes = conversationNotes ?? ''
              interview.lastSemesterNotes = lastSemesterNotes ?? ''
              interview.mockLessonExplanations = mockLessonExplanations ?? 0
              interview.mockLessonNotes = mockLessonNotes ?? ''
              interview.mockLessonPace = mockLessonPace ?? 0
              interview.mockLessonOverall = mockLessonOverall ?? 0
              interview.teachingPreferences = teachingPreferences ?? ''
              interview.mockLessonEngagement = mockLessonEngagement ?? 0
              interview.availabilityNotes = availabilityNotes ?? ''
            } else {
              decision = null
              likelyDecision = null
              notes = ''
            }
            loading = false
          })
        } else {
          decision = null
          likelyDecision = null
          notes = ''
          loading = false
        }
      } else {
        alert.trigger('error', 'Application not found.')
      }
    })
  }

  function saveNotes() {
    const frozenId = id
    loading = true
    if (frozenId !== undefined) {
      setDoc(doc(db, decisionsCollection, frozenId), {
        interview,
      })
        .then(() => {
          updateDoc(doc(db, applicationsCollection, frozenId), {
            'meta.decision': doc(db, decisionsCollection, frozenId),
          })
            .then(() => {
              invalidate('app:applications').then(() => {
                alert.trigger('success', 'Notes updated successfully.')
                loading = false
              })
            })
            .catch(() => {
              loading = false
            })
        })
        .catch((err) => {
          alert.trigger('error', 'Something went wrong. Please try again.')
          loading = false
          console.log(err)
        })
    }
  }

  function handleLikelyDecision(newDecision: 'likely yes' | 'likely no') {
    const frozenId = id
    loading = true
    if (frozenId !== undefined) {
      setDoc(doc(db, decisionsCollection, frozenId), {
        likelyDecision: newDecision,
        type: decision,
        notes,
      })
        .then(() => {
          updateDoc(doc(db, applicationsCollection, frozenId), {
            'meta.decision': doc(db, decisionsCollection, frozenId),
          })
            .then(() => {
              invalidate('app:applications').then(() => {
                alert.trigger('success', 'Decision updated successfully.')
                likelyDecision = newDecision
                loading = false
              })
            })
            .catch(() => {
              loading = false
            })
        })
        .catch((err) => {
          alert.trigger('error', 'Something went wrong. Please try again.')
          loading = false
          console.log(err)
        })
    }
  }

  async function handleDecision(newDecision: Data.Decision) {
    // Get today's date
    let today = new Date();

    // Calculate the date 7 days from today
    let weekDeadline = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);    let interviewDeadline = formatDateShort(weekDeadline)

    const dueDate = await getDoc(doc(db, 'semesterDates', semesterDatesDocument))
    if(dueDate.exists()) {
      interviewDeadline = formatDateShort(new Date(Math.min(weekDeadline, new Date(dueDate.data().instructorOrientation))))
    }

    const confirmation = confirm(
      'Are you sure you want to update the decision? An email will be sent to the applicant, and you should not be changing the decision after this.',
    )
    if (!confirmation) {
      return
    }
    const frozenId = id
    loading = true
    if (frozenId !== undefined) {
      setDoc(doc(db, decisionsCollection, frozenId), {
        type: newDecision,
        likelyDecision,
        notes,
      })
        .then(() => {
          updateDoc(doc(db, applicationsCollection, frozenId), {
            'meta.decision': doc(db, decisionsCollection, frozenId),
          })
            .then(() => {
              invalidate('app:applications').then(() => {
                alert.trigger('success', 'Decision updated successfully.')
                decision = newDecision
                loading = false
              })
              if (newDecision === 'interview') {
                fetch('/api/scheduleInterview', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    type: 'scheduleInterview',
                    email: values.personal.email,
                    name: values.personal.firstName,
                    deadline: interviewDeadline,
                  }),
                })
              } else {
                fetch('/api/decision', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    type: 'decision',
                    decision: newDecision,
                    email: values.personal.email,
                    name: values.personal.firstName,
                  }),
                })
              }
            })
            .catch(() => {
              loading = false
            })
        })
        .catch((err) => {
          alert.trigger('error', 'Something went wrong. Please try again.')
          loading = false
          console.log(err)
        })
    }
  }
  function handleEdit() {
    disabled = false
  }
  function handleSaveChanges() {
    loading = true
    disabled = true
    if (id !== undefined) {
      setDoc(doc(db, applicationsCollection, id), values)
        .then(() => {
          invalidate('app:applications').then(() => {
            alert.trigger('success', 'Changes were saved successfully.')
            loading = false
          })
        })
        .catch((err: FirebaseError) => {
          console.log(err)
          alert.trigger('error', err.code, true)
          loading = false
        })
    }
  }
  function handleDeleteChanges() {
    disabled = true
    values = cloneDeep(dbValues)
  }
</script>

<Dialog bind:this={dialogEl} size="full" alert>
  <svelte:fragment slot="title">Application</svelte:fragment>
  <div slot="description">
    <Card>
      <div class="sticky top-2 z-50 flex justify-between gap-3 p-3 md:p-3">
        <fieldset class="flex gap-3" disabled={loading}>
          {#if disabled}
            <Button
              color={!loading &&
              (likelyDecision === null || likelyDecision === 'likely yes')
                ? 'green'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleLikelyDecision('likely yes')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-5 h-5"
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
              (likelyDecision === null || likelyDecision === 'likely no')
                ? 'red'
                : 'gray'}
              class="flex items-center gap-1"
              on:click={() => handleLikelyDecision('likely no')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-5 h-5"
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
                ><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path
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
                class="w-5 h-5"
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
                class="w-5 h-5"
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
                class="w-5 h-5"
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
        <div class="flex gap-3">
          <Button color="green" on:click={() => showInterviewForm = !showInterviewForm}>{showInterviewForm ? "Close Interview Form" : "Show Interview Form"}</Button>
          {#if disabled && !showInterviewForm}
            <Button on:click={handleEdit}>Edit</Button>
          {/if}
          <Button on:click={dialogEl.cancel}>Close</Button>
        </div>
      </div>    
    </Card>
    <div class="mt-4 flex justify-center">
      {#if !showInterviewForm}
      <Form class="max-w-2xl">
        <fieldset class="space-y-14" {disabled}>
          <div class="grid gap-1">
            <span class="font-bold">Personal</span>
            <Card class="my-2 grid gap-3">
              <div class="rounded-md bg-gray-100 px-3 py-2 shadow-sm">
                {`Name: ${values.personal.firstName} ${values.personal.lastName}`}
              </div>
              <div class="rounded-md bg-gray-100 px-3 py-2 shadow-sm">
                {`Email: ${values.personal.email}`}
              </div>
              <div class="text-sm">
                Wrong name or email? Go to your <a class="link" href="/profile"
                  >profile</a
                > to update your information.
              </div>
            </Card>
            <Input
              type="tel"
              bind:value={values.personal.phoneNumber}
              label="Phone number"
              floating
              required
              pattern="[\d\s\-\+]+"
            />
            <Input
              type="date"
              bind:value={values.personal.dateOfBirth}
              label="Date of birth"
              floating
              required
            />

            <Select
              bind:value={values.personal.gender}
              label="Gender"
              options={gendersJson}
              floating
              required
            />
            <div class="grid gap-1">
              <span>Race / ethnicity (check all that apply)</span>
              <div class="grid grid-cols-2">
                {#each raceJson as race}
                  <Input
                    type="checkbox"
                    bind:value={values.personal.race}
                    label={race.name}
                  />
                {/each}
              </div>
            </div>
          </div>
          <div class="grid gap-1">
            <span class="font-bold">Academic</span>
            <div class="grid gap-1 sm:grid-cols-3 sm:gap-3">
              <div class="sm:col-span-2">
                <Input
                  type="text"
                  bind:value={values.academic.school}
                  label="Current school"
                  floating
                  required
                />
              </div>
              <Input
                type="number"
                bind:value={values.academic.graduationYear}
                label="Graduation year"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 20}
                floating
                required
              />
            </div>
          </div>
          <div class="grid gap-1">
            <div class="mt-3 grid gap-1">
              <span class="font-bold"
                >Which of the following courses are you comfortable teaching?
                Check all that apply. Course descriptions are on our website.</span
              >
              <div class="grid grid-cols-2 gap-2">
                {#each coursesJson as course}
                  <Input
                    type="checkbox"
                    bind:value={values.program.courses}
                    label={course.name}
                    required
                  />
                {/each}
              </div>
            </div>

            <div class="mt-4">
              <span class="font-bold"
                >If you have any preferences for the courses you teach, please
                list them here.</span
              >
              <Input
                type="text"
                bind:value={values.program.preferences}
                label="Preferences"
                floating
              />
            </div>

            <div class="mt-3 grid gap-1">
              <span class="font-bold">Timeslots</span>
              <Input
                type="text"
                bind:value={values.program.timeSlots}
                label="Please describe your weekly availability. For example, 'weekdays after 4pm' or 'weekends anytime'."
                required
              />
            </div>

            <div class="mt-2">
              <Textarea
                bind:value={values.program.notAvailable}
                label="When will you not be available to teach classes during the semester? Include potential conflicts such as medical absences, vacations, and athletic events."
                required
              />
            </div>

            <Input
              type="checkbox"
              bind:value={values.program.inPerson}
              label="For our in-person offering in the fall, gbSTEM is holding a new Lego Robotics competition program for students grade 5 and up. The program will meet weekly in-person at the Cambridge Public Library on Saturdays 1:00-3:00pm; parents are encouraged to help coach the robotics team. There are 10 slots available this year and will be more in the future. You may apply for this program on top of two courses, but if you are selected you will only be able to enroll in one additional course. Would you like to apply for the robotics program?"
            />

            <div class="mt-2">
              <Select
                bind:value={values.program.reason}
                label="How did you learn about gbSTEM?"
                options={reasonsJson}
                floating
                required
              />
            </div>

            <div class="mt-5">
              <span class="font-bold">Essays</span>
              <div class="mt-2">
                <Input
                  type="checkbox"
                  bind:value={values.essay.taughtBefore}
                  label="Have you taught for gbSTEM before?"
                />
              </div>
              <div class="mt-2">
                <Textarea
                  bind:value={values.essay.academicBackground}
                  label="Describe your academic background in any of the classes you said you were comfortable teaching. List any relevant coursework, projects, or extracurriculars. (500 char limit)"
                  required
                  maxlength={500}
                />
              </div>
              {#if !values.essay.taughtBefore}
                <div class="mt-2">
                  <Textarea
                    bind:value={values.essay.teachingScenario}
                    label="Suppose your students are not engaging in the class. What would you do? (500 char limit)"
                    required
                    maxlength={500}
                  />
                </div>
                <div class="mt-2">
                  <Textarea
                    bind:value={values.essay.why}
                    label="Why do you want to teach for gbSTEM? (500 char limit)"
                    required
                    maxlength={500}
                  />
                </div>
              {/if}
            </div>
            <div class="grid gap-1">
              <span class="font-bold">Agreements</span>
              <div class="grid">
                <Input
                  type="checkbox"
                  bind:value={values.agreements.entireProgram}
                  label="gbSTEM will run from September 29th to December 21st. Do you confirm that you will be able to teach for the entirety of the program?"
                  required
                />
                <Input
                  type="checkbox"
                  bind:value={values.agreements.timeCommitment}
                  label="Do you hereby confirm that if you are selected as an instructor, that you will be able to make the weekly time commitment of 2 hours a week for each class you teach? "
                  required
                />
                <Input
                  type="checkbox"
                  bind:value={values.agreements.submitting}
                  label="I understand submitting means I can no longer make changes to my application. Don't check this box until you are sure that you are ready to submit."
                  required
                />
              </div>
            </div>
          </div>
        </fieldset>
      </Form>
      {:else}
      <Form class="max-w-2xl">
      <div>
        <h2 class = "text-2xl font-bold my-4">Interview Guide & Evaluation Form</h2>
        <Input
          type="datetime-local"
          bind:value={interview.date}
          label="Interview Date"
          floating
          required
        />
        <Input 
          type="text"
          bind:value={interview.interviewer}
          label="Interviewer"
          floating
          required
        />
        <Select
          type="text"
          bind:value={interview.attendance}
          label="Attendance"
          floating
          required
        />
        <ul class = "rounded-lg bg-gray-100 p-4 my-4 list-disc">          
          <li>Greet the candidate when they arrive & ask them how they are, general conversational beginning. Try to be personable and make them comfortable!</li>
          <li>Introduce yourself: name, grade, school, and role at gbSTEM. For example: “I’ll start by introducing myself. My name is __________, and I am a [GRADE] at [SCHOOL] high school. I have been an instructor at gbSTEM for [NUM SEMESTERS] semesters and am currently a [ROLE AT gbSTEM] at gbSTEM.”</li>
          <li>If they are a new candidate: ask them to introduce themselves. For example: “Could you tell me a little about yourself?” Ask them some questions. In addition to getting to know them, we want to get a good idea of how they interact!</li>
        </ul>
        <Input
          type="number"
          bind:value={interview.conversation}
          min="-5"
          max="5"
          label="Please rank the candidate's friendliness and how well you think they would work with children on a -5 to 5 scale, -5 being the worst and 5 being the best."
          required
        />
        <Textarea
          bind:value={interview.conversationNotes}
          label="Conversation Notes"
          optional
        />
        <div class = "rounded-lg bg-gray-100 p-4 my-4">
          Clarify the subject they are applying to teach for (plus the level), clarify if there are other subjects that they could be considered for. Ask them to state their preferences, such as top 3.
        </div>
        <Textarea
          bind:value={interview.teachingPreferences}
          label="What courses does the candidate want to teach?"
          required
        />
        {#if values.essay.taughtBefore}
        <div class = "rounded-lg bg-gray-100 p-4 my-4">
          <div>Ask them about their experience as an instructor. For example, “You're a returning instructor, correct? I would like to take some time to talk about your experience last semester. Could you give me an overview of the good, the bad, anything that can be improved?” </div>
          <div class="font-bold">Followup questions about their experience, as needed:</div>
          <ul class="list-disc">
            <li>How did you find the curriculum? Were there any parts that were too fast, too slow?</li>
            <li>Did your students enjoy the class? Were they engaged, and do you feel like they learned the content well?</li>
            <li>How was student attendance?</li>
            <li>Did you have any issues with technology, such as the Free Zoom limit, WiFi, anything?</li>
            <li>Did you feel supported by your track leadership if you had questions, and informed about events?</li>
            <li>How do you think you can improve as an instructor this semester?</li>
          </ul>
        </div>
          <Textarea
            bind:value={interview.lastSemesterNotes}
            label="Last semester notes"
            required
          />   
        {:else}  
        <div class="rounded-lg bg-gray-100 p-4 my-4">
          <div class="font-bold">Talk a little about the logistics of being an instructor.</div>
          <ul class="list-disc">
            <li>Classes meet twice a week; 60 min</li>
            <li>Most classes will take place through Microsoft Teams (link will be provided for you). This is something new we are trying this year, so we may fall back on Zoom/Google Meet if needed.</li>
            <li>Class sizes are usually between 5-15 students, but keep in mind that not every student will be able to attend every class session.</li>
            <li>The curriculum for your classes will be provided to you and accessible on the portal.</li>
            <li>You'll be able to check in with the curriculum developer and director for your course regularly to give feedback & ask questions</li>
            <li>Do you have any questions?</li>
          </ul>
        </div>
        {/if}
        <div class="rounded-lg bg-gray-100 p-4 my-4">
        <div>Continue onto the mock lessons. Send the link for the candidate’s top subject to teach. Allow each candidate 3 minutes to familiarize themselves with the lesson before having them share their screen to present it to you. Note their delivery, audience engagement, ability to speak slowly and clearly, quality of explanations, as well as their attitude.</div>
        <div class ="flex gap-4">
          <Button class="bg-[#aaaaaa]" href="https://docs.google.com/presentation/d/1dtv0qWFLNg3pjnlPCkm8nKEkEU_m5-dcLVMNEJmwFjk/edit#slide=id.g11b679f5bf6_0_9">Math Mock Lesson Materials</Button>
          <Button color="green" href="https://docs.google.com/presentation/d/15aI-M8eEPKsFGpodmZ_oi4MWQKzTJ8Jrup4C7oFgSls/edit#slide=id.g2085bab7786_0_0">Environmental Science Mock Lesson Materials</Button>
          <Button color="yellow" href="https://docs.google.com/presentation/d/1yf3ZOVCFgwILyihaG_sJonevv3cIiUMNvDlwJVarCto/edit#slide=id.g2085d4bbb38_0_4125">Engineering Mock Lesson Materials</Button>
        </div>
        <div class = "flex gap-4 mt-4">
          <Button color="blue" href="https://docs.google.com/document/d/1ruPmF-SRdWQ_LlilQz0PBFX1p7gDpfGZ1jVBmSpdgyI/edit#">Scratch Mock Lesson Materials</Button>
          <Button color="blue" href="https://docs.google.com/document/d/1-Q40jjtKjt1dvX09qndC1ZEA7amiieAQgXF8qPDEvOE/edit">Python I Mock Lesson Materials</Button>
          <Button color="blue" href="https://docs.google.com/document/d/1LonFfZTQOwjz_QeZbRHb_RFVq_EntkVu64BBca2TVGw/edit">Web Dev Mock Lesson Materials</Button>
        </div>
        </div>
        <Input
          type="number"
          bind:value={interview.mockLessonExplanations}
          min="-5"
          max="5"
          label="Please rank the clarity of the candidate's explanations of material in the mock lesson on a -5 to 5 scale, -5 being the worst and 5 being the best."
          required
        />
        <Input
          type="number"
          bind:value={interview.mockLessonEngagement}
          min="-5"
          max="5"
          label="Please rank the candidate's engagement with the audience (asking questions, relating to students, etc.) in the mock lesson on a -5 to 5 scale, -5 being the worst and 5 being the best."
          required
        />
        <Input
          type="number"
          bind:value={interview.mockLessonPace}
          min="-5"
          max="5"
          label="Please rank the pace of the mock lesson on a -5 to 5 scale, -5 being the worst and 5 being the best."
          required
        />
        <Input
          type="number"
          bind:value={interview.mockLessonOverall}
          min="-5"
          max="5"
          label="Please rank the overall quality of the mock lesson on a -5 to 5 scale, -5 being the worst and 5 being the best."
          required
        />
        <Textarea
          bind:value={interview.mockLessonNotes}
          label="Mock lesson notes. What went well? What could be improved? If there was a low pacing score, why -- too fast or too slow?"
          required
        />
        <div class="rounded-lg bg-gray-100 p-4 my-4">
        <div class="font-bold">
          Continue:
        </div>
        <ul class="list-disc">
          <li>Outline that classes meet twice a week from September 29th to December 21st. Ask if they have any known scheduling conflicts, days they will have to miss, or days of the week they can't make.</li>
          <li>Remind them that, as the teacher, they are obviously required to go to all classes and show up on time, and they should also prepare for the class before the class happens by looking through the curriculum.</li>
          <li>Additionally, emphasize that we expect them to respond to emails and slack messages within 24 hours.</li>
          <li>Ask if they are meet all of the above expectations, and if there is anything we can help them with to make sure they are able to do all this.”</li>
        </ul>
      </div>
        <Textarea
          bind:value={interview.availabilityNotes}
          label="Availability notes. When is the candidate not available? Are there any potential concerns with the candidate's availability?"
          required
        />
        <div class="rounded-lg bg-gray-100 p-4 my-4">
        <div>Thank them for speaking with you, and let them know that they can reach us at contact@gbstem.org. Additionally, tell them that if they are accepted, instructor orientation will be on Sept. 20th, so they should mark their calendars for that.</div>
        <div>Mark "Likely Yes" or "Likely No" depending on your decision recommendation. Be careful NOT to click "Interview", "Accept", "Waitlist", or "Reject".</div>  
        </div>
        <Textarea
          bind:value={notes}
          label="This is a space for notes on your recommendation, if you feel that it needs further explanation."
        />
      <div class="mt-2 font-bold">Once you have completed this form, click "Save Notes" to submit it!</div>
      <div class="flex justify-start gap-4">
        <Button color="green" on:click={saveNotes}>Save Notes</Button>
        <Button color="red" on:click={() => showInterviewForm = false}>Close Interview Form</Button> 
      </div>
      </div>
     </Form>
      {/if}
    </div>
  </div>
</Dialog>
