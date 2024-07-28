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
    import { registrationsCollection } from '$lib/data/collections'

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
    getDoc(doc(db, registrationsCollection, id)).then(
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
      setDoc(doc(db, registrationsCollection, id), values)
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
  <svelte:fragment slot="title">Registration</svelte:fragment>
  <div slot="description">
    <Card class="sticky top-2 z-50 flex justify-between gap-3 p-3 md:p-3">
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
            <span class="mt-3 font-bold">Pre-Registration</span>
            <p class="mb-2">
              To register for our spring semester, you must first fill out this
              form, providing your availability and course preferences. After
              this initial registration, class schedules will be posted once
              pre-registration closes. You will then receive an email
              notification to proceed with class enrollment on a first-come,
              first-served basis.
            </p>
            <span class="font-bold">Personal</span>
            <Card class="my-2 grid gap-3">
              <div class="rounded-md bg-gray-100 px-3 py-2 shadow-sm">
                {`Parent Name: ${values.personal.parentFirstName} ${values.personal.parentLastName}`}
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
              type="text"
              bind:value={values.personal.studentFirstName}
              label="Student first name"
              floating
              required
            />

            <Input
              type="text"
              bind:value={values.personal.studentLastName}
              label="Student last name"
              floating
              required
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
            <div class="grid gap-1 sm:grid-cols-3 sm:gap-3">
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
            <span class="font-bold">Course Interest (max 2 courses)</span>
            <span
              >Note that selecting your courses below is NOT formally enrolling
              in the course. Your response here will help us estimate the number
              of sections for each course. Course enrollment will be on a
              first-come, first-served basis, and you will be notified via email
              when enrollment opens.
            </span>
            <span
              >Go to <a
                href="https://gbstem.org/#/cs"
                class="link"
                target="_blank"
                >https://gbstem.org/#/cs
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
                href="https://gbstem.org/#/math"
                class="link"
                target="_blank"
                >https://gbstem.org/#/math
              </a> for more information.
            </span>
            <span class="text-sm"
              >gbSTEM math classes have a separate fall and spring curriculum
              for each level. For example, we offer Math 1a in the Fall and Math
              1b in the Spring.

              <p class="font-bold">Students from Fall 2023:</p>
              <p>
                If you took a math class in the fall 2023 semester, it's
                advisable to opt for the “b” version of the course. For example,
                if you completed Math 2a in the fall, you should proceed to Math
                2b.
              </p>

              <p class="font-bold">Students from Spring 2023:</p>

              <p>
                If your most recent math class was in the spring semester of
                2023 (and you did not take any math class in the fall 2023
                semester), you should continue with the “a” semester of the next
                level course you were enrolled in. For example, if you completed
                Math 3b in the spring, you would proceed to Math 4a.
                Unfortunately, we don't offer the "a" section of math courses in
                the spring, so we recommend waiting until next fall to enroll in
                a math course.
              </p>
            </span>
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
                href="https://gbstem/#/engineering"
                class="link"
                target="_blank"
                >https://gbstem.org/#/engineering
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
                href="https://gbstem.org/#/science"
                class="link"
                target="_blank"
                >https://gbstem.org/#/science
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
              label="gbSTEM will offer in-person classes at the Cambridge Public Library on Saturdays 2:30-4:30pm. Would you like to opt for the in-person option if available for your child? Note that we cannot guarantee that in-person classes will be available for all students."
            />
          </div>
          <div class="grid gap-1">
            <span class="font-bold">Agreements</span>
            <div class="grid">
              <Input
                type="checkbox"
                bind:value={values.agreements.entireProgram}
                label="gbSTEM will run from September 24th to December 23rd. Will the student be able to participate throughout the entirety of the program?"
                required
              />

              <Input
                type="checkbox"
                bind:value={values.agreements.timeCommitment}
                label="Do you hereby confirm that the student can meet the gbSTEM weekly time commitment? Please understand that an unused spot for your child prevents others from joining or getting their preferred time slots. The time commitment for EACH course selected is at minimum 2 hours per week.  This means that if your student takes an engineering and math course the time commitment will be 4 hours a week. Students are not allowed to miss classes unless for medical reasons or family emergencies."
                required
              />
              <Input
                type="checkbox"
                bind:value={values.agreements.submitting}
                label="I understand submitting means I can no longer make changes to my pre-registration. Don't check this box until you are sure that you are ready to submit."
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
