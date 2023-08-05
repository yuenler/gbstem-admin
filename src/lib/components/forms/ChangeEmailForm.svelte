<script lang="ts">
  import Input from '$lib/components/Input.svelte'
  import clsx from 'clsx'
  import { alert } from '$lib/stores'
  import { verifyBeforeUpdateEmail } from 'firebase/auth'
  import Dialog from '$lib/components/Dialog.svelte'
  import ReauthenticateForm from '$lib/components/forms/ReauthenticateForm.svelte'
  import Form from '$lib/components/Form.svelte'
  import { user } from '$lib/client/firebase'
  import DialogActions from '../DialogActions.svelte'
  import Button from '../Button.svelte'

  let className = ''
  export { className as class }

  let dialogEl: Dialog
  let disabled = false
  let showValidation = false
  let values = {
    newEmail: '',
  }
  function handleSubmit(e: CustomEvent<SubmitData>) {
    if (e.detail.error === null) {
      showValidation = false
      disabled = true
      dialogEl.open()
    } else {
      showValidation = true
      alert.trigger('error', e.detail.error)
    }
  }
  function handleCancel() {
    disabled = false
    values = {
      newEmail: '',
    }
    alert.trigger('info', 'Email change canceled.')
  }
  function handleReauthenticate() {
    if ($user) {
      dialogEl.close()
      verifyBeforeUpdateEmail($user.object, values.newEmail)
        .then(() => {
          disabled = false
          values = {
            newEmail: '',
          }
          alert.trigger('info', 'A verification email was sent.')
        })
        .catch((err) => {
          disabled = false
          alert.trigger('error', err.code, true)
        })
    }
  }
</script>

<Form
  class={clsx(showValidation && 'show-validation', className)}
  on:submit={handleSubmit}
>
  <fieldset {disabled}>
    <span class="font-bold">Change email</span>
    <Input
      type="email"
      value={$user && $user.object.email ? $user.object.email : ''}
      placeholder="Current email"
      floating
      readonly
    />
    <div class="relative">
      <Input
        class="pr-[5.25rem]"
        type="email"
        bind:value={values.newEmail}
        placeholder="New email"
        floating
        required
      />
      <div class="absolute right-2 top-0 flex h-12 items-center">
        <Button color="blue" padding="px-2 py-1" type="submit">Update</Button>
      </div>
    </div>
  </fieldset>
</Form>

<Dialog bind:this={dialogEl} on:cancel={handleCancel}>
  <svelte:fragment slot="title">Reauthenticate</svelte:fragment>
  <svelte:fragment slot="description">
    <ReauthenticateForm on:reauthenticate={handleReauthenticate}>
      <DialogActions>
        <Button on:click={dialogEl.cancel}>Cancel</Button>
        <Button type="submit" color="blue">Reauthenticate</Button>
      </DialogActions>
    </ReauthenticateForm>
  </svelte:fragment>
</Dialog>
