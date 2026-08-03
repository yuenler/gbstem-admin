<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'
  import Brand from '$lib/components/Brand.svelte'
  import Button from '$lib/components/Button.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import DialogActions from '$lib/components/DialogActions.svelte'
  import EmailInput from '$lib/components/EmailInput.svelte'
  import Link from '$lib/components/Link.svelte'
  import Loading from '$lib/components/Loading.svelte'
  import PasswordInput from '$lib/components/PasswordInput.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import type { ActionData, PageData } from './$types'

  interface Props {
    data: PageData
    form: ActionData
  }

  let { data, form }: Props = $props()

  let showErrorDialog = $state(true)

  let disabled = $state(false)
  let values = $state({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  })
</script>

<svelte:head>
  <title>Sign up</title>
</svelte:head>

<form
  class="w-full max-w-lg"
  method="POST"
  action="/signup"
  use:enhance={() => {
    disabled = true
    return async ({ result, update }) => {
      disabled = false
      switch (result.type) {
        case 'success': {
          return goto('/signin')
        }
        default: {
          values = {
            ...values,
            password: '',
            confirmPassword: '',
          }
          break
        }
      }
      update()
    }
  }}
>
  <fieldset class="space-y-4" {disabled}>
    <Brand />
    <h1 class="text-2xl font-bold">Sign up</h1>
    <input name="token" type="hidden" value={data.token} />
    <div class="relative space-y-4">
      <div class="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <TextInput bind:value={values.firstName} label="First name" required />
        <TextInput bind:value={values.lastName} label="Last name" required />
      </div>
      <EmailInput bind:value={values.email} label="Email" required />
      <PasswordInput
        bind:value={values.password}
        label="Password"
        required
        autocomplete="new-password"
      />
      <PasswordInput
        bind:value={values.confirmPassword}
        label="Confirm password"
        required
        autocomplete="new-password"
        validations={[
          [
            values.password !== values.confirmPassword,
            'Passwords do not match.',
          ],
        ]}
      />
      {#if disabled}
        <Loading class="absolute -inset-2 -top-4 z-50" />
      {/if}
    </div>
    <div class="mt-2 flex items-center justify-between">
      <div>
        <Link href="/signin">Need to sign in?</Link>
      </div>
      <Button color="blue" type="submit">Sign up</Button>
    </div>
  </fieldset>
</form>

{#if form?.error}
  <Dialog bind:open={showErrorDialog} alert>
    {#snippet title()}
      Error
    {/snippet}
    {#snippet description()}
      <div>
        <p>
          {#if form?.error}{form.error}{/if}
        </p>
        <DialogActions>
          <Button color="gray" onclick={() => (showErrorDialog = false)}
            >Close</Button
          >
        </DialogActions>
      </div>
    {/snippet}
  </Dialog>
{/if}
