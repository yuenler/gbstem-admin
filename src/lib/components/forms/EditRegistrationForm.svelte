<script lang="ts">
  import { doc, setDoc } from 'firebase/firestore'
  import { db } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import { invalidate } from '$app/navigation'
  import type { FirebaseError } from 'firebase/app'
  import {
    currentSemester,
    registrationsCollection,
    semesterIdFromPath,
    withSemester,
  } from '$lib/data/collections'
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

  interface Props {
    id: string | undefined
    values: Data.Registration<'client'>
    dbValues?: Data.Registration<'client'> | undefined
    disabled?: boolean
    formEl?: HTMLFormElement | undefined
    collection?: string
  }

  let {
    id,
    values = $bindable(),
    dbValues = $bindable(),
    disabled = $bindable(true),
    formEl = $bindable(undefined),
    collection = registrationsCollection,
  }: Props = $props()

  const schema = registrationSchema

  function toFormValues(v: Data.Registration<'client'>) {
    return {
      personal: {
        studentFirstName: v.personal?.studentFirstName || '',
        studentLastName: v.personal?.studentLastName || '',
        parentFirstName: v.personal?.parentFirstName || '',
        parentLastName: v.personal?.parentLastName || '',
        email: v.personal?.email || '',
        secondaryEmail: v.personal?.secondaryEmail || '',
        phoneNumber: v.personal?.phoneNumber || '',
        dateOfBirth: v.personal?.dateOfBirth || '',
        gender: v.personal?.gender || '',
        race: v.personal?.race || [],
        frlp: v.personal?.frlp || '',
        parentEducation: v.personal?.parentEducation || '',
      },
      academic: {
        school: v.academic?.school || '',
        grade: v.academic?.grade || '',
      },
      program: {
        csCourse: v.program?.csCourse || '',
        mathCourse: v.program?.mathCourse || '',
        engineeringCourse: v.program?.engineeringCourse || '',
        scienceCourse: v.program?.scienceCourse || '',
        inPerson:
          v.program?.inPerson !== undefined ? v.program.inPerson : false,
        reason: v.program?.reason || '',
      },
      inPerson: {
        allergies: v.inPerson?.allergies || '',
        parentPickup: v.inPerson?.parentPickup || '',
      },
      agreements: {
        mediaRelease:
          v.agreements?.mediaRelease !== undefined
            ? v.agreements.mediaRelease
            : false,
        bypassAgeLimits:
          v.agreements?.bypassAgeLimits !== undefined
            ? v.agreements.bypassAgeLimits
            : false,
        entireProgram:
          v.agreements?.entireProgram !== undefined
            ? v.agreements.entireProgram
            : false,
        timeCommitment:
          v.agreements?.timeCommitment !== undefined
            ? v.agreements.timeCommitment
            : false,
        submitting:
          v.agreements?.submitting !== undefined
            ? v.agreements.submitting
            : false,
      },
    }
  }

  const formResult = superForm(
    defaults(toFormValues(values) as any, zod(schema as any) as any) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      resetForm: false,
      dataType: 'json',
      async onUpdate({ form: formVal }) {
        if (!formVal.valid) return
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
          try {
            await setDoc(
              doc(db, collection, id),
              withSemester(
                updatedValues,
                semesterIdFromPath(collection) ?? currentSemester,
              ),
            )
            values = updatedValues
            dbValues = cloneDeep(updatedValues)
            disabled = true
            await invalidate('app:registrations')
            alert.trigger('success', 'Changes were saved successfully.')
          } catch (err: any) {
            console.error('Registration save changes error:', err)
            const isPermissionDenied =
              err.code === 'permission-denied' ||
              String(err).includes('permission') ||
              String(err).includes('Permission')
            const msg = isPermissionDenied
              ? 'You do not have permission to modify this registration.'
              : err.code || err.message
            alert.trigger('error', msg, !isPermissionDenied)
          }
        }
      },
    },
  )

  const { form, enhance, submitting } = formResult

  // React to parent values changing (e.g. loaded data or cancel changes)
  $effect(() => {
    form.set(toFormValues(values))
  })
</script>

<form bind:this={formEl} use:enhance class="w-full max-w-2xl">
  <fieldset class="space-y-14" disabled={disabled || $submitting}>
    <div class="grid gap-1">
      <span class="font-bold">Personal</span>
      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="mt-2 flex flex-col gap-1.5">
          <FormInput
            form={formResult}
            name="personal.studentFirstName"
            label="Student first name"
            bind:value={$form.personal.studentFirstName}
          />
        </div>

        <div class="mt-2 flex flex-col gap-1.5">
          <FormInput
            form={formResult}
            name="personal.studentLastName"
            label="Student last name"
            bind:value={$form.personal.studentLastName}
          />
        </div>
      </div>

      <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
        <div class="mt-2 flex flex-col gap-1.5">
          <FormInput
            form={formResult}
            name="personal.email"
            label="Student email"
            type="email"
            bind:value={$form.personal.email}
          />
        </div>

        <div class="mt-2 flex flex-col gap-1.5">
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
        <div class="mt-2 flex flex-col gap-1.5">
          <FormInput
            form={formResult}
            name="personal.phoneNumber"
            label="Phone number"
            type="tel"
            bind:value={$form.personal.phoneNumber}
          />
        </div>

        <div class="mt-2 flex flex-col gap-1.5">
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
        <div class="mt-2 flex flex-col gap-1.5">
          <FormSelect
            form={formResult}
            name="personal.gender"
            label="Gender"
            options={gendersJson}
            bind:value={$form.personal.gender}
          />
        </div>

        <div class="mt-2 flex flex-col gap-1.5">
          <FormSelect
            form={formResult}
            name="personal.frlp"
            label="Eligible for federal free or reduced lunch program?"
            options={frlpJson}
            bind:value={$form.personal.frlp}
          />
        </div>
      </div>

      <div class="mt-2 flex flex-col gap-1.5">
        <FormSelect
          form={formResult}
          name="personal.parentEducation"
          label="Highest level of education completed"
          options={parentEducationJson}
          bind:value={$form.personal.parentEducation}
        />
      </div>

      <div class="mt-4 grid gap-1">
        <span class="text-sm font-semibold"
          >Race / ethnicity (check all that apply)</span
        >
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {#each raceJson as race (race.name)}
            <div class="flex items-center">
              <input
                type="checkbox"
                value={race.name}
                bind:group={$form.personal.race}
                id={`race-${race.name}`}
                class="peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:outline-hidden"
              />
              <label
                for={`race-${race.name}`}
                class="ml-2 cursor-pointer text-sm peer-disabled:text-gray-400"
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
        <div class="mt-2 flex flex-col gap-1.5 sm:col-span-2">
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
        <div class="mt-2 flex flex-col gap-1.5">
          <FormSelect
            form={formResult}
            name="program.csCourse"
            label="CS course"
            options={csCoursesJson}
            bind:value={$form.program.csCourse}
          />
        </div>

        <div class="mt-2 flex flex-col gap-1.5">
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
        <div class="mt-2 flex flex-col gap-1.5">
          <FormSelect
            form={formResult}
            name="program.engineeringCourse"
            label="Engineering course"
            options={engineeringCoursesJson}
            bind:value={$form.program.engineeringCourse}
          />
        </div>

        <div class="mt-2 flex flex-col gap-1.5">
          <FormSelect
            form={formResult}
            name="program.scienceCourse"
            label="Science course"
            options={scienceCoursesJson}
            bind:value={$form.program.scienceCourse}
          />
        </div>
      </div>

      <div class="mt-2 flex flex-col gap-1.5">
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
        <span class="text-lg font-bold">In Person</span>
        <span class="mb-2 text-sm leading-tight text-gray-500"
          >Hybrid classes meet once a week on weekend afternoons at the
          Cambridge Public Library.</span
        >
        <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
          <div class="mt-2 flex flex-col gap-1.5">
            <FormInput
              form={formResult}
              name="inPerson.allergies"
              label="Student allergies / medical conditions"
              placeholder="Leave blank if none"
              bind:value={$form.inPerson.allergies}
            />
          </div>

          <div class="mt-2 flex flex-col gap-1.5">
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
