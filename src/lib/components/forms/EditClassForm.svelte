<script lang="ts">
  import { doc, setDoc } from 'firebase/firestore'
  import { db } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import { invalidate } from '$app/navigation'
  import type { FirebaseError } from 'firebase/app'
  import { coursesJson, daysOfWeekJson } from '$lib/data'
  import { classesCollection, withSemester } from '$lib/data/collections'
  import type ClassData from '$lib/data/types/ClassData'
  import { superForm, defaults } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { classSchema } from './schemas'
  import FormInput from '../FormInput.svelte'
  import FormNativeSelect from '../FormNativeSelect.svelte'
  import FormCheckbox from '../FormCheckbox.svelte'

  export let id: string | undefined
  export let values: ClassData
  export let disabled = true
  export let formEl: HTMLFormElement | undefined = undefined

  const schema = classSchema

  const formResult = superForm(
    defaults(
      {
        course: '',
        gradeRecommendation: '',
        classCap: 0,
        meetingLink: '',
        classDay1: '',
        classTime1: '',
        classDay2: '',
        classTime2: '',
        online: true,
      },
      zod(schema as any) as any,
    ) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      resetForm: false,
      applyAction: false,
      async onUpdate({ form: formVal }) {
        if (!formVal.valid) return
        if (id !== undefined) {
          const updatedValues = {
            ...values,
            ...formVal.data,
          }
          try {
            await setDoc(
              doc(db, classesCollection, id),
              withSemester(updatedValues),
            )
            values = updatedValues
            disabled = true
            await invalidate('app:registrations')
            alert.trigger('success', 'Changes were saved successfully.')
          } catch (err: any) {
            console.error('Class save changes error:', err)
            alert.trigger('error', err.code || err.message, true)
          }
        }
      },
    },
  )

  const { form, enhance, submitting } = formResult

  // React to parent values changing (e.g. initial load or cancel changes)
  $: if (values) {
    $form.course = values.course || ''
    $form.gradeRecommendation = values.gradeRecommendation || ''
    $form.classCap = values.classCap || 0
    $form.meetingLink = values.meetingLink || ''
    $form.classDay1 = values.classDay1 || ''
    $form.classTime1 = values.classTime1 || ''
    $form.classDay2 = values.classDay2 || ''
    $form.classTime2 = values.classTime2 || ''
    $form.online = values.online !== undefined ? values.online : true
  }
</script>

<form bind:this={formEl} use:enhance class="w-full max-w-4xl">
  <fieldset class="mt-4 space-y-4" disabled={disabled || $submitting}>
    <div class="grid gap-1 sm:grid-cols-3 sm:gap-3">
      <div class="flex flex-col gap-1">
        <FormNativeSelect
          form={formResult}
          name="course"
          label="Course"
          bind:value={$form.course}
        >
          <option value="" disabled>Select a course</option>
          {#each coursesJson as course}
            <option value={course.name}>{course.name}</option>
          {/each}
        </FormNativeSelect>
      </div>

      <div class="flex flex-col gap-1">
        <FormInput
          form={formResult}
          name="gradeRecommendation"
          label="Grade recommendation"
          placeholder="e.g. 3-5 or 6-8"
          bind:value={$form.gradeRecommendation}
        />
      </div>

      <div class="flex flex-col gap-1">
        <FormInput
          form={formResult}
          name="classCap"
          label="Class capacity"
          type="number"
          inputName="class-capacity"
          bind:value={$form.classCap}
        />
      </div>
    </div>

    {#if $form.online}
      <div class="flex flex-col gap-1">
        <FormInput
          form={formResult}
          name="meetingLink"
          label="Meeting link"
          required
          bind:value={$form.meetingLink}
        />
      </div>
    {/if}

    <div class="grid gap-1">
      <span class="text-sm font-bold text-gray-700"
        >Online classes meet twice weekly at consistent days and times
        throughout the semester and run for 45-60 minutes each. In-person
        classes meet once a week on a weekend afternoon at the Cambridge Public
        Library.
      </span>

      <div class="mt-2 grid gap-1 sm:grid-cols-3 sm:gap-3">
        <div class="flex flex-col gap-1 sm:col-span-2">
          <FormNativeSelect
            form={formResult}
            name="classDay1"
            label="Meeting day 1"
            bind:value={$form.classDay1}
          >
            <option value="" disabled>Select a day</option>
            {#each daysOfWeekJson as day}
              <option value={day.name}>{day.name}</option>
            {/each}
          </FormNativeSelect>
        </div>

        <div class="flex flex-col gap-1">
          <FormInput
            form={formResult}
            name="classTime1"
            label="Meeting time 1"
            type="time"
            bind:value={$form.classTime1}
          />
        </div>
      </div>

      {#if $form.online}
        <div class="mt-2 grid gap-1 sm:grid-cols-3 sm:gap-3">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <FormNativeSelect
              form={formResult}
              name="classDay2"
              label="Meeting day 2"
              required
              bind:value={$form.classDay2}
            >
              <option value="" disabled>Select a day</option>
              {#each daysOfWeekJson as day}
                <option value={day.name}>{day.name}</option>
              {/each}
            </FormNativeSelect>
          </div>

          <div class="flex flex-col gap-1">
            <FormInput
              form={formResult}
              name="classTime2"
              label="Meeting time 2"
              type="time"
              bind:value={$form.classTime2}
            />
          </div>
        </div>
      {/if}
    </div>

    <div class="flex flex-col gap-1.5 pt-2">
      <FormCheckbox
        form={formResult}
        name="online"
        label="Class taught online?"
        bind:checked={$form.online}
      />
    </div>
  </fieldset>
</form>
