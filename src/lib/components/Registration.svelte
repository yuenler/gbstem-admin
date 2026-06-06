<script lang="ts">
  import { db } from '$lib/client/firebase'
  import Card from '$lib/components/Card.svelte'
  import { registrationsCollection } from '$lib/data/collections'
  import { alert } from '$lib/stores'
  import {
    type Timestamp,
    doc,
    getDoc,
    serverTimestamp,
  } from 'firebase/firestore'
  import { cloneDeep } from 'lodash-es'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import EditRegistrationForm from './forms/EditRegistrationForm.svelte'

  export let dialogEl: Dialog
  export let id: string | undefined
  export let collection: string = registrationsCollection

  let loading = true
  let disabled = true
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
      created: serverTimestamp() as Timestamp,
      updated: serverTimestamp() as Timestamp,
    },
  }

  let values: Data.Registration<'client'> = cloneDeep(defaultValues)
  let decision: Data.Decision | null
  let formEl: HTMLFormElement

  $: if (id !== undefined) {
    loading = true
    disabled = true
    values = cloneDeep(defaultValues)
    getDoc(doc(db, collection, id)).then((registrationSnapshot) => {
      const data = registrationSnapshot.data() as Data.Registration<'client'>
      if (registrationSnapshot.exists()) {
        values = cloneDeep(data)
        dbValues = cloneDeep(data)
        loading = false
      } else {
        alert.trigger('error', 'Registration not found.')
        loading = false
      }
    })
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
    // Reset to loaded database values
    values = cloneDeep(dbValues)
  }
</script>

<Dialog bind:this={dialogEl} size="full" alert>
  <svelte:fragment slot="title">Registration</svelte:fragment>
  <div slot="description" class="w-full min-w-0">
    <Card
      class="sticky top-2 z-50 flex flex-wrap items-center justify-between gap-3 p-3"
    >
      {#if !disabled}
        <div class="flex flex-wrap gap-2">
          <Button color="green" on:click={handleSaveChanges}
            >Save changes</Button
          >
          <Button color="red" on:click={handleDeleteChanges}
            >Delete changes</Button
          >
        </div>
      {/if}
      <div class="flex flex-wrap gap-2">
        <Button on:click={handleEdit}>Edit</Button>
        <Button on:click={dialogEl.cancel}>Close</Button>
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
</Dialog>
