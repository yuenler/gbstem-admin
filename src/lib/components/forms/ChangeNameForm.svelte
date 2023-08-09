<script lang="ts">
  import Input from '$lib/components/Input.svelte'
  import clsx from 'clsx'
  import { alert } from '$lib/stores'
  import { updateProfile } from 'firebase/auth'
  import Form from '$lib/components/Form.svelte'
  import { user } from '$lib/client/firebase'
  import { onMount } from 'svelte'
  import Button from '../Button.svelte'

  let className = ''
  export { className as class }

  let disabled = true
  let showValidation = false
  let values = {
    fullName: '',
  }
  onMount(() => {
    return user.subscribe((user) => {
      if (user) {
        values.fullName = user.object.displayName as string
        disabled = false
      }
    })
  })
  function handleSubmit(e: CustomEvent<SubmitData>) {
    if ($user) {
      const frozenUser = $user
      if (e.detail.error === null) {
        showValidation = false
        disabled = true
        updateProfile(frozenUser.object, {
          displayName: values.fullName.trim(),
        })
          .then(() => {
            alert.trigger('success', 'Name successfully updated.')
          })
          .catch(() => {
            alert.trigger('error', 'Failed to update name.')
          })
          .finally(() => {
            disabled = false
          })
      } else {
        showValidation = true
        alert.trigger('error', e.detail.error)
      }
    }
  }
</script>

<Form
  class={clsx(showValidation && 'show-validation', className)}
  on:submit={handleSubmit}
>
  <fieldset {disabled}>
    <span class="font-bold">Name</span>
    <div class="flex gap-2">
      <Input
        type="text"
        bind:value={values.fullName}
        label="Full name"
        floating
        required
      />
      <Button
        class="mt-2 flex h-12 w-12 shrink-0 items-center justify-center p-0"
        color="blue"
        type="submit"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-6 w-6"
        >
          <path
            d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
          /><polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </Button>
    </div>
  </fieldset>
</Form>
