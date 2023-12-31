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
  import nProgress from 'nprogress'

  export let dialogEl: Dialog
  export let id: string | undefined

  let loading = true
  let disabled = true
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
      timeSlots: [],
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
    },
    timestamps: {
      created: serverTimestamp() as Timestamp,
      updated: serverTimestamp() as Timestamp,
    },
  }
  let values: Data.Application<'client'> = cloneDeep(defaultValues)
  let decision: Data.Decision | null
  $: if (id !== undefined) {
    loading = true
    disabled = true
    values = cloneDeep(defaultValues)
    getDoc(doc(db, 'applicationsSpring24', id)).then((applicationSnapshot) => {
      const data = applicationSnapshot.data() as Data.Application<'client'>
      if (applicationSnapshot.exists()) {
        values = cloneDeep(data)
        dbValues = cloneDeep(data)
        if (data.meta.decision) {
          getDoc(data.meta.decision).then((decisionSnapshot) => {
            const data = decisionSnapshot.data() as { type: Data.Decision }
            if (decisionSnapshot.exists()) {
              decision = data.type
            } else {
              decision = null
            }
            loading = false
          })
        } else {
          decision = null
          loading = false
        }
      } else {
        alert.trigger('error', 'Application not found.')
      }
    })
  }
  function handleDecision(newDecision: Data.Decision) {
    const frozenId = id
    loading = true
    if (frozenId !== undefined) {
      setDoc(doc(db, 'decisions', frozenId), {
        type: newDecision,
      })
        .then(() => {
          updateDoc(doc(db, 'applicationsFall23', frozenId), {
            'meta.decision': doc(db, 'decisions', frozenId),
          })
            .then(() => {
              invalidate('app:applications').then(() => {
                alert.trigger('success', 'Decision updated successfully.')
                decision = newDecision
                loading = false
              })
            })
            .catch(() => {
              loading = false
            })
        })
        .catch(() => {
          alert.trigger('error', 'Something went wrong. Please try again.')
          loading = false
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
      setDoc(doc(db, 'applicationsFall23', id), values)
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
    <Card class="sticky top-2 z-50 flex justify-between gap-3 p-3 md:p-3">
      <fieldset class="flex gap-3" disabled={loading}>
        {#if disabled}
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
            color={!loading && (decision === null || decision === 'waitlisted')
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
            >Delete changes</Button
          >
        {/if}
      </fieldset>
      <div class="flex gap-3">
        {#if disabled}
          <Button on:click={handleEdit}>Edit</Button>
        {/if}
        <Button on:click={dialogEl.cancel}>Close</Button>
      </div>
    </Card>
    <div class="mt-4 flex justify-center">
      <Form class="max-w-2xl">
        <fieldset class="space-y-14" {disabled}>
          <div class="grid gap-1">
            <span class="font-bold">Personal</span>
            <Card class="grid gap-3 my-2">
              <div class="bg-gray-100 shadow-sm rounded-md px-3 py-2">
                {`Name: ${values.personal.firstName} ${values.personal.lastName}`}
              </div>
              <div class="bg-gray-100 shadow-sm rounded-md px-3 py-2">
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
            <div class="grid sm:grid-cols-3 gap-1 sm:gap-3">
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

            <div class="mt-4">
              <span class="font-bold"
                >How many classes would you be able to teach a week? Each class
                will meet for 2 hours a week.</span
              >
              <Select
                bind:value={values.program.numClasses}
                label="Num classes per week"
                options={classesPerWeekJson}
                floating
                required
              />
            </div>

            <div class="mt-3 grid gap-1">
              <span class="font-bold">Timeslots</span>
              <div class="grid grid-cols-2 gap-2">
                {#each timeSlotsJson as timeSlot}
                  <Input
                    type="checkbox"
                    bind:value={values.program.timeSlots}
                    label={timeSlot.name}
                    required
                  />
                {/each}
              </div>
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
              label="gbSTEM will offer both virtual classes and in-person classes at the Cambridge Public Library. Check this box if you would be able to conduct in-person lessons."
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
                  label="gbSTEM will run from September 17th to December 23rd. Do you confirm that you will be able to teach for the entirety of the program?"
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
    </div>
  </div>
</Dialog>
