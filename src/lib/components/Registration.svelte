<script lang="ts">
  import Card from '$lib/components/Card.svelte'
  import { registrationsCollection } from '$lib/data/collections'
  import { registrationService } from '$lib/services/registrationService'
  import { alert } from '$lib/stores'
  import { type Timestamp, serverTimestamp } from 'firebase/firestore'
  import { cloneDeep } from 'lodash-es'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import EditRegistrationForm from './forms/EditRegistrationForm.svelte'

  interface Props {
    open?: boolean
    id: string | undefined
    collection?: string
  }

  let {
    open = $bindable(false),
    id,
    collection = registrationsCollection,
  }: Props = $props()

  let disabled = $state(true)
  let dbValues: Data.Registration<'client'> | undefined = $state()

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
      uid: '',
      submitted: false,
    },
    timestamps: {
      created: serverTimestamp() as Timestamp,
      updated: serverTimestamp() as Timestamp,
    },
  }

  let values: Data.Registration<'client'> = $state(cloneDeep(defaultValues))
  let formEl: HTMLFormElement | undefined = $state()

  $effect(() => {
    const currentId = id
    if (!open || currentId === undefined) return
    let cancelled = false
    ;(async () => {
      disabled = true
      try {
        const data = await registrationService.fetchRegistration(
          collection,
          currentId,
        )
        if (cancelled) return
        if (data) {
          values = cloneDeep(data)
          dbValues = cloneDeep(data)
        } else {
          alert.trigger('error', 'Registration not found.')
        }
      } catch (err: any) {
        console.error('Failed to load registration:', err)
        alert.trigger('error', 'Failed to load registration.')
      }
    })()
    return () => {
      cancelled = true
    }
  })

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
    // Reset to loaded database values
    if (dbValues) values = cloneDeep(dbValues)
  }
</script>

<Dialog bind:open size="full" alert>
  {#snippet title()}
    Registration
  {/snippet}
  {#snippet description()}
    <div class="w-full min-w-0">
      <Card
        class="sticky top-2 z-50 flex flex-wrap items-center justify-between gap-3 p-3"
      >
        {#if !disabled}
          <div class="flex flex-wrap gap-2">
            <Button color="green" onclick={handleSaveChanges}
              >Save changes</Button
            >
            <Button color="red" onclick={handleDeleteChanges}
              >Delete changes</Button
            >
          </div>
        {/if}
        <div class="flex flex-wrap gap-2">
          <Button onclick={handleEdit}>Edit</Button>
          <Button onclick={() => (open = false)}>Close</Button>
        </div>
      </Card>
      <div class="mt-4 flex justify-center">
        <EditRegistrationForm
          bind:formEl
          bind:disabled
          bind:values
          bind:dbValues
          {id}
          {collection}
        />
      </div>
    </div>
  {/snippet}
</Dialog>
