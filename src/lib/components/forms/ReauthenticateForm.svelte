<script lang="ts">
  import Input from '$lib/components/Input.svelte'
  import clsx from 'clsx'
  import { user } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import {
    EmailAuthProvider,
    reauthenticateWithCredential,
  } from 'firebase/auth'
  import { createEventDispatcher } from 'svelte'
  import Form from '$lib/components/Form.svelte'

  const dispatch = createEventDispatcher()
  let disabled = false
  let showValidation = false
  let values = {
    password: '',
  }
  function handleSubmit(e: CustomEvent<SubmitData>) {
    if ($user) {
      if (e.detail.error === null) {
        showValidation = false
        disabled = true
        reauthenticateWithCredential(
          $user.object,
          EmailAuthProvider.credential(
            $user.object.email as string,
            values.password,
          ),
        )
          .then(() => {
            dispatch('reauthenticate', true)
          })
          .catch((err) => {
            disabled = false
            alert.trigger('error', err.code, true)
          })
      } else {
        showValidation = true
        alert.trigger('error', e.detail.error)
      }
    }
  }
</script>

<Form
  class={clsx(showValidation && 'show-validation')}
  on:submit={handleSubmit}
>
  <fieldset class="space-y-4" {disabled}>
    <Input
      type="password"
      bind:value={values.password}
      label="Password"
      floating
      required
      autocomplete="current-password"
      focus
    />
    <slot />
  </fieldset>
</Form>
