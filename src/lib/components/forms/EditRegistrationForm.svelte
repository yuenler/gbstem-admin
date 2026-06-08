<script lang="ts">
  import { doc, setDoc } from 'firebase/firestore'
  import { db } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import { invalidate } from '$app/navigation'
  import type { FirebaseError } from 'firebase/app'
  import { registrationsCollection } from '$lib/data/collections'
  import { superForm, defaults } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { registrationSchema } from './schemas'
  import { cloneDeep } from 'lodash-es'
  import {
    gendersJson,
    reasonsJson,
    raceJson,
    mathCoursesJson,
    frlpJson,
    parentEducationJson,
    csCoursesJson,
    engineeringCoursesJson,
    scienceCoursesJson,
    gradesJson,
  } from '$lib/data'
  import FormInput from '../FormInput.svelte'
  import FormSelect from '../FormSelect.svelte'
  import FormCheckbox from '../FormCheckbox.svelte'
  import FormTextarea from '../FormTextarea.svelte'

  export let id: string | undefined
  export let values: Data.Registration<'client'>
  export let dbValues: Data.Registration<'client'>
  export let disabled = true
  export let formEl: HTMLFormElement | undefined = undefined
  export let collection: string = registrationsCollection

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
    inPerson: {
      allergies: '',
      parentPickup: '',
    },
    agreements: {
      mediaRelease: false,
      bypassAgeLimits: false,
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
      created: null as any,
      updated: null as any,
    },
  }

  const schema = registrationSchema

  const formResult = superForm(
    defaults(cloneDeep(defaultValues) as any, zod(schema as any) as any) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      dataType: 'json',
      async onUpdate({ form: formVal }) {
        if (!formVal.valid) return
        disabled = true
        if (id !== undefined) {
          const updatedValues = {
            ...values,
            personal: {
              ...values.personal,
              ...formVal.data.personal,
            },
            academic: {
              ...values.academic,
              ...formVal.data.academic,
            },
            program: {
              ...values.program,
              ...formVal.data.program,
            },
            inPerson: {
              ...values.inPerson,
              ...formVal.data.inPerson,
            },
            agreements: {
              ...values.agreements,
              ...formVal.data.agreements,
            },
          }
          setDoc(doc(db, collection, id), updatedValues)
            .then(() => {
              values = updatedValues
              dbValues = cloneDeep(updatedValues)
              invalidate('app:registrations').then(() => {
                alert.trigger('success', 'Changes were saved successfully.')
              })
            })
            .catch((err: FirebaseError) => {
              console.error('Registration save changes error:', err)
              alert.trigger('error', err.code, true)
              disabled = false
            })
        }
      },
    },
  )

  const { form, enhance } = formResult

  // React to parent values changing (e.g. loaded data or cancel changes)
  $: if (values) {
    $form.personal = {
      studentFirstName: values.personal?.studentFirstName || '',
      studentLastName: values.personal?.studentLastName || '',
      parentFirstName: values.personal?.parentFirstName || '',
      parentLastName: values.personal?.parentLastName || '',
      email: values.personal?.email || '',
      secondaryEmail: values.personal?.secondaryEmail || '',
      phoneNumber: values.personal?.phoneNumber || '',
      dateOfBirth: values.personal?.dateOfBirth || '',
      gender: values.personal?.gender || '',
      race: values.personal?.race || [],
      frlp: values.personal?.frlp || '',
      parentEducation: values.personal?.parentEducation || '',
    }
    $form.academic = {
      school: values.academic?.school || '',
      grade: values.academic?.grade || '',
    }
    $form.program = {
      csCourse: values.program?.csCourse || '',
      mathCourse: values.program?.mathCourse || '',
      engineeringCourse: values.program?.engineeringCourse || '',
      scienceCourse: values.program?.scienceCourse || '',
      inPerson:
        values.program?.inPerson !== undefined
          ? values.program.inPerson
          : false,
      reason: values.program?.reason || '',
    }
    $form.inPerson = {
      allergies: values.inPerson?.allergies || '',
      parentPickup: values.inPerson?.parentPickup || '',
    }
    $form.agreements = {
      mediaRelease:
        values.agreements?.mediaRelease !== undefined
          ? values.agreements.mediaRelease
          : false,
      bypassAgeLimits:
        values.agreements?.bypassAgeLimits !== undefined
          ? values.agreements.bypassAgeLimits
          : false,
      entireProgram:
        values.agreements?.entireProgram !== undefined
          ? values.agreements.entireProgram
          : false,
      timeCommitment:
        values.agreements?.timeCommitment !== undefined
          ? values.agreements.timeCommitment
          : false,
      submitting:
        values.agreements?.submitting !== undefined
          ? values.agreements.submitting
          : false,
    }
  }
</script>

<form bind:this={formEl} use:enhance class="w-full max-w-2xl">
  <fieldset class="space-y-14" {disabled}>
    <div class="grid gap-1">
      <span class="font-bold">Personal</span>
      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="flex flex-col gap-1.5 mt-2">
          <FormInput
            form={formResult}
            name="personal.studentFirstName"
            label="Student first name"
            bind:value={$form.personal.studentFirstName}
          />
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <FormInput
            form={formResult}
            name="personal.studentLastName"
            label="Student last name"
            bind:value={$form.personal.studentLastName}
          />
        </div>
      </div>

      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="flex flex-col gap-1.5 mt-2">
          <FormInput
            form={formResult}
            name="personal.email"
            label="Student email"
            type="email"
            bind:value={$form.personal.email}
          />
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <FormInput
            form={formResult}
            name="personal.secondaryEmail"
            label="Secondary email"
            type="email"
            bind:value={$form.personal.secondaryEmail}
          />
        </div>
      </div>

      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="flex flex-col gap-1.5 mt-2">
          <FormInput
            form={formResult}
            name="personal.phoneNumber"
            label="Phone number"
            type="tel"
            bind:value={$form.personal.phoneNumber}
          />
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <FormInput
            form={formResult}
            name="personal.dateOfBirth"
            label="Date of birth"
            type="date"
            bind:value={$form.personal.dateOfBirth}
          />
        </div>
      </div>

      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="flex flex-col gap-1.5 mt-2">
          <FormSelect
            form={formResult}
            name="personal.gender"
            label="Gender"
            options={gendersJson}
            bind:value={$form.personal.gender}
          />
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <FormSelect
            form={formResult}
            name="personal.frlp"
            label="Eligible for federal free or reduced lunch program?"
            options={frlpJson}
            bind:value={$form.personal.frlp}
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5 mt-2">
        <FormSelect
          form={formResult}
          name="personal.parentEducation"
          label="Highest level of education completed"
          options={parentEducationJson}
          bind:value={$form.personal.parentEducation}
        />
      </div>

      <div class="grid gap-1 mt-4">
        <span class="font-semibold text-sm"
          >Race / ethnicity (check all that apply)</span
        >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {#each raceJson as race}
            <div class="flex items-center">
              <input
                type="checkbox"
                value={race.name}
                bind:group={$form.personal.race}
                id={`race-${race.name}`}
                class="peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:outline-hidden focus:ring-1 focus:ring-gray-600"
              />
              <label
                for={`race-${race.name}`}
                class="ml-2 text-sm cursor-pointer peer-disabled:text-gray-400"
              >
                {race.name}
              </label>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="grid gap-1">
      <span class="font-bold">Academic</span>
      <div class="grid gap-1 sm:grid-cols-3 sm:gap-3">
        <div class="sm:col-span-2 flex flex-col gap-1.5 mt-2">
          <FormInput
            form={formResult}
            name="academic.school"
            label="School"
            bind:value={$form.academic.school}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <FormSelect
            form={formResult}
            name="academic.grade"
            inputName="student-grade"
            label="Grade"
            options={gradesJson}
            bind:value={$form.academic.grade}
          />
        </div>
      </div>
    </div>

    <div class="grid gap-1">
      <span class="font-bold">Program Details</span>
      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="flex flex-col gap-1.5 mt-2">
          <FormSelect
            form={formResult}
            name="program.csCourse"
            label="CS course"
            options={csCoursesJson}
            bind:value={$form.program.csCourse}
          />
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <FormSelect
            form={formResult}
            name="program.mathCourse"
            label="Math course"
            options={mathCoursesJson}
            bind:value={$form.program.mathCourse}
          />
        </div>
      </div>

      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="flex flex-col gap-1.5 mt-2">
          <FormSelect
            form={formResult}
            name="program.engineeringCourse"
            label="Engineering course"
            options={engineeringCoursesJson}
            bind:value={$form.program.engineeringCourse}
          />
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <FormSelect
            form={formResult}
            name="program.scienceCourse"
            label="Science course"
            options={scienceCoursesJson}
            bind:value={$form.program.scienceCourse}
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5 mt-2">
        <FormSelect
          form={formResult}
          name="program.reason"
          label="Why are you enrolling your child?"
          options={reasonsJson}
          bind:value={$form.program.reason}
        />
      </div>

      <div class="flex flex-col gap-1.5 pt-4">
        <FormCheckbox
          form={formResult}
          name="program.inPerson"
          label="Is your child interested in hybrid (in-person and online) learning?"
          bind:checked={$form.program.inPerson}
        />
      </div>
    </div>

    {#if $form.program.inPerson}
      <div class="grid gap-1">
        <span class="font-bold text-lg">In Person</span>
        <span class="text-sm text-gray-500 mb-2 leading-tight"
          >Hybrid classes meet once a week on weekend afternoons at the
          Cambridge Public Library.</span
        >
        <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
          <div class="flex flex-col gap-1.5 mt-2">
            <FormInput
              form={formResult}
              name="inPerson.allergies"
              label="Student allergies / medical conditions"
              placeholder="Leave blank if none"
              bind:value={$form.inPerson.allergies}
            />
          </div>

          <div class="flex flex-col gap-1.5 mt-2">
            <FormInput
              form={formResult}
              name="inPerson.parentPickup"
              label="Names of adults authorized for pickup"
              placeholder="e.g. Jane Doe"
              bind:value={$form.inPerson.parentPickup}
            />
          </div>
        </div>
      </div>
    {/if}

    <div class="grid gap-2">
      <span class="font-bold">Agreements</span>
      <div class="space-y-4">
        <div class="flex flex-col gap-1.5">
          <FormCheckbox
            form={formResult}
            name="agreements.mediaRelease"
            label="I grant gbSTEM permission to take and use photos/videos of my child for promotional purposes."
            bind:checked={$form.agreements.mediaRelease}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <FormCheckbox
            form={formResult}
            name="agreements.bypassAgeLimits"
            label="I request to bypass grade limitations for classes my child is interested in."
            bind:checked={$form.agreements.bypassAgeLimits}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <FormCheckbox
            form={formResult}
            name="agreements.entireProgram"
            label="I agree to enroll my child for the entire duration of the program."
            bind:checked={$form.agreements.entireProgram}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <FormCheckbox
            form={formResult}
            name="agreements.timeCommitment"
            label="I confirm my child can meet the required weekly time commitment."
            bind:checked={$form.agreements.timeCommitment}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <FormCheckbox
            form={formResult}
            name="agreements.submitting"
            label="I authorize the submission of this registration form."
            bind:checked={$form.agreements.submitting}
          />
        </div>
      </div>
    </div>
  </fieldset>
</form>
