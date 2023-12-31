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
  import {
    gendersJson,
    reasonsJson,
    raceJson,
    mathCoursesJson,
    timeSlotsJson,
    frlpJson,
    parentEducationJson,
    csCoursesJson,
    engineeringCoursesJson,
    scienceCoursesJson,
    gradesJson,
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
  let dbValues: Data.Registration<'client'>
  const defaultValues: Data.Registration<'client'> = {
    personal: {
      email: '',
      studentFirstName: '',
      studentLastName: '',
      parentFirstName: '',
      parentLastName: '',
      gender: '',
      race: [],
      phoneNumber: '',
      dateOfBirth: '',
      frlp: '',
      parentEducation: '',
      secondaryEmail: '',
    },
    academic: {
      school: '',
      grade: '',
    },
    program: {
      csCourse: '',
      engineeringCourse: '',
      mathCourse: '',
      scienceCourse: '',
      timeSlots: [],
      inPerson: false,
      reason: '',
    },
    agreements: {
      entireProgram: false,
      timeCommitment: false,
      submitting: false,
    },
    meta: {
      id: '',
      uid: '',
      submitted: false,
    },
    timestamps: {
      created: serverTimestamp() as Timestamp,
      updated: serverTimestamp() as Timestamp,
    },
  }
  let values: Data.Registration<'client'> = cloneDeep(defaultValues)
  let decision: Data.Decision | null
  $: if (id !== undefined) {
    loading = true
    disabled = true
    values = cloneDeep(defaultValues)
    getDoc(doc(db, 'registrationsSpring24', id)).then(
      (registrationSnapshot) => {
        const data = registrationSnapshot.data() as Data.Registration<'client'>
        if (registrationSnapshot.exists()) {
          values = cloneDeep(data)
          dbValues = cloneDeep(data)
        } else {
          alert.trigger('error', 'Registration not found.')
        }
      },
    )
  }

  function handleEdit() {
    disabled = false
  }
  function handleSaveChanges() {
    loading = true
    disabled = true
    if (id !== undefined) {
      setDoc(doc(db, 'registrationsSpring24', id), values)
        .then(() => {
          invalidate('app:registrations').then(() => {
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
  <svelte:fragment slot="title">registration</svelte:fragment>
  <div slot="description">
    <Card class="sticky top-2 z-50 flex justify-between gap-3 p-3 md:p-3">
      <!-- <fieldset class="flex gap-3" disabled={loading}>
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
      </fieldset> -->

      {#if !disabled}
        <Button color="green" on:click={handleSaveChanges}>Save changes</Button>
        <Button color="red" on:click={handleDeleteChanges}
          >Delete changes</Button
        >
      {/if}
      <div class="flex gap-3">
        <Button on:click={handleEdit}>Edit</Button>
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
                {`Name: ${values.personal.studentFirstName} ${values.personal.studentLastName}`}
              </div>
              <div class="bg-gray-100 shadow-sm rounded-md px-3 py-2">
                {`Username:`}
              </div>
              <div class="text-sm">
                Wrong name or email? Go to your <a class="link" href="/profile"
                  >profile</a
                > to update your information.
              </div>
            </Card>

            <Input
              type="text"
              bind:value={values.personal.parentFirstName}
              label="Parent first name"
              floating
            />

            <Input
              type="text"
              bind:value={values.personal.parentLastName}
              label="Parent last name"
              floating
            />

            <Input
              type="email"
              bind:value={values.personal.email}
              label="Primary email"
              floating
              required
            />
            <Input
              type="email"
              bind:value={values.personal.secondaryEmail}
              label="Secondary email"
              floating
            />
            <Input
              type="tel"
              bind:value={values.personal.phoneNumber}
              label="Phone number"
              floating
              required
            />
            <Input
              type="date"
              bind:value={values.personal.dateOfBirth}
              label="Student Date of birth"
              floating
              required
            />
            <Select
              bind:value={values.personal.gender}
              label="Student gender"
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

            <Select
              bind:value={values.personal.frlp}
              label="Eligible for federal free or reduced lunch program?"
              options={frlpJson}
              floating
              required
            />
            <Select
              bind:value={values.personal.parentEducation}
              label="Parent's highest level of education"
              options={parentEducationJson}
              floating
              required
            />
          </div>
          <div class="grid gap-1">
            <span class="font-bold">Academic</span>
            <div class="grid sm:grid-cols-3 gap-1 sm:gap-3">
              <div class="sm:col-span-2">
                <Input
                  type="text"
                  bind:value={values.academic.school}
                  label="Student's current school"
                  floating
                  required
                />
              </div>
              <Select
                bind:value={values.academic.grade}
                label="Student Grade"
                options={gradesJson}
                floating
                required
              />
            </div>
          </div>
          <div class="grid gap-1">
            <span class="font-bold">Course Selection</span>
            <span
              >Go to <a
                href="https://gbstem.org/cs"
                class="link"
                target="_blank"
                >https://gbstem.org/cs
              </a> for more information</span
            >
            <div class="mb-2">
              <Select
                bind:value={values.program.csCourse}
                label="Computer Science course"
                options={csCoursesJson}
                floating
                required
              />
            </div>
            <span
              >Go to <a
                href="https://gbstem.org/math"
                class="link"
                target="_blank"
                >https://gbstem.org/math
              </a> for more information.
            </span>
            <span class="text-sm"
              >Note that each math course is broken down into two semesters with
              different content. If your child was enrolled for a math course
              during the gbSTEM Fall 2022 semester, they should enroll in a
              second semester of that same course.</span
            >
            <div class="mb-2">
              <Select
                bind:value={values.program.mathCourse}
                label="Math course"
                options={mathCoursesJson}
                floating
                required
              />
            </div>
            <span
              >Go to <a
                href="https://gbstem.org/engineering"
                class="link"
                target="_blank"
                >https://gbstem.org/engineering
              </a> for more information</span
            >
            <div class="mb-2">
              <Select
                bind:value={values.program.engineeringCourse}
                label="Engineering course"
                options={engineeringCoursesJson}
                floating
                required
              />
            </div>
            <span
              >Go to <a
                href="https://gbstem.org/science"
                class="link"
                target="_blank"
                >https://gbstem.org/science
              </a> for more information</span
            >
            <div class="mt-2">
              <Select
                bind:value={values.program.scienceCourse}
                label="Science course"
                options={scienceCoursesJson}
                floating
                required
              />
            </div>
            <div class="mt-3 grid gap-1">
              <span class="font-bold">Timeslots</span>
              <span
                >You must check at least as many boxes as the number of classes
                you select. Note that we cannot guarantee that you will be
                placed into one of your desired timeslots, but we will try our
                best.</span
              >
              <div class="grid grid-cols-2 gap-2">
                {#each timeSlotsJson as timeSlot}
                  <Input
                    type="checkbox"
                    bind:value={values.program.timeSlots}
                    label={timeSlot.name}
                  />
                {/each}
              </div>
            </div>

            <div class="mt-2">
              <Select
                bind:value={values.program.reason}
                label="How did you learn about gbSTEM?"
                options={reasonsJson}
                floating
                required
              />
            </div>

            <Input
              type="checkbox"
              bind:value={values.program.inPerson}
              label="gbSTEM will offer in-person classes at the Cambridge Public Library. Would you like to opt for the in-person option if available for your student? Note that we cannot guarantee that in-person classes will be available for all students."
            />
          </div>
          <div class="grid gap-1">
            <span class="font-bold">Agreements</span>
            <div class="grid">
              <Input
                type="checkbox"
                bind:value={values.agreements.entireProgram}
                label="gbSTEM will run from September 17th to December 23rd. Will the student be able to participate throughout the entirety of the program?"
                required
              />

              <Input
                type="checkbox"
                bind:value={values.agreements.timeCommitment}
                label="Do you hereby confirm that the student can meet the gbSTEM weekly time commitment? Once you have registered for your courses, you will not be able to unenroll. Please understand that an unused spot for your child prevents others from joining or getting their preferred time slots. The time commitment for EACH course selected is at minimum 2 hours per week.  This means that if your student takes an engineering and math course the time commitment will be 4 hours a week. Students are not allowed to miss classes unless for medical reasons or family emergencies."
                required
              />
              <Input
                type="checkbox"
                bind:value={values.agreements.submitting}
                label="I understand submitting means I can no longer make changes to my application. Don't check this box until you are sure that you are ready to submit."
                required
              />
            </div>
            <span class="mt-4"
              >If you have any questions or concerns, please email
              <a href="mailto:contact@gbstem.org" class="link" target="_blank">
                contact@gbstem.org
              </a>.
            </span>
          </div>
        </fieldset>
      </Form>
    </div>
  </div>
</Dialog>
