<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'
  import Brand from '$lib/components/Brand.svelte'
  import Button from '$lib/components/Button.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import DialogActions from '$lib/components/DialogActions.svelte'
  import Input from '$lib/components/Input.svelte'
  import Link from '$lib/components/Link.svelte'
  import Loading from '$lib/components/Loading.svelte'
  import type { ActionData, PageData } from './$types'

  export let data: PageData
  export let form: ActionData

  let dialogEl: Dialog

  let disabled = false
  let values = {
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  }
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
        <Input
          type="text"
          bind:value={values.firstName}
          label="First name"
          floating
          required
        />
        <Input
          type="text"
          bind:value={values.lastName}
          label="Last name"
          floating
          required
        />
      </div>
      <Input
        type="email"
        bind:value={values.email}
        label="Email"
        floating
        required
      />
      <Input
        type="password"
        bind:value={values.password}
        label="Password"
        floating
        required
        autocomplete="new-password"
      />
      <Input
        type="password"
        bind:value={values.confirmPassword}
        label="Confirm password"
        floating
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
  <Dialog bind:this={dialogEl} initial alert>
    <svelte:fragment slot="title">Error</svelte:fragment>
    <div slot="description">
      <p>
        {#if form?.error}{form.error}{/if}
      </p>
      <DialogActions>
        <Button color="gray" on:click={dialogEl.cancel}>Close</Button>
      </DialogActions>
    </div>
  </Dialog>
{/if}
