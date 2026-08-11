<script lang="ts">
  import type { ActionRequestBody } from '../../api/action/+server'
  import ChangeEmailForm from '$lib/components/forms/ChangeEmailForm.svelte'
  import ChangePasswordForm from '$lib/components/forms/ChangePasswordForm.svelte'
  import DeleteAccountForm from '$lib/components/forms/DeleteAccountForm.svelte'
  import { fade } from 'svelte/transition'
  import { alert } from '$lib/stores'
  import ChangeNameForm from '$lib/components/forms/ChangeNameForm.svelte'
  import Card from '$lib/components/Card.svelte'
  import type { PageData } from './$types'
  import { user } from '$lib/client/firebase'
  import Field from '$lib/components/Field.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import Button from '$lib/components/Button.svelte'
  import DialogActions from '$lib/components/DialogActions.svelte'
  import { writeToClipboard } from '$lib/utils'

  interface Props {
    data: PageData
  }

  let { data }: Props = $props()

  // svelte-ignore state_referenced_locally
  let showVerifyDialog = $state(!data.user.emailVerified)
  let disabled = $state(false)

  async function handleVerificationEmail() {
    if ($user) {
      disabled = true
      const payload: ActionRequestBody = {
        type: 'verifyEmail',
      }
      fetch('/api/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (res.ok) {
          alert.trigger('info', 'Verification email was sent.')
        } else {
          const { message } = await res.json()
          alert.trigger('error', message)
        }
        disabled = false
      })
    }
  }
</script>

<svelte:head>
  <title>Profile</title>
</svelte:head>

<Dialog bind:open={showVerifyDialog} size="min">
  {#snippet title()}
    Please verify your email
  {/snippet}
  {#snippet description()}
    <div class="space-y-4">
      <p>
        Your email is not verified. Please check your inbox and spam folder for
        the verification email. If you want to use another email, please change
        your email through the profile.
      </p>
      <DialogActions>
        <Button onclick={() => (showVerifyDialog = false)}>Close</Button>
      </DialogActions>
    </div>
  {/snippet}
</Dialog>

<h1 class="mb-8 text-5xl font-bold md:text-6xl">Profile</h1>

<div class="flex flex-col items-center">
  <div class="grid w-full max-w-2xl gap-6">
    {#if !data.user.emailVerified}
      <div
        class="mt-2 flex w-full items-center gap-4 rounded-md bg-red-200 px-5 py-4 shadow-sm"
        transition:fade
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-6 w-6 shrink-0"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div class="grow">
          Email is not verified. Try reloading or check your inbox to verify
          your account. Can't find the email? <button
            class="inline-block border-b border-black text-black transition-colors duration-300 hover:border-gray-600 hover:text-gray-600 disabled:border-gray-600 disabled:text-gray-600"
            type="button"
            onclick={handleVerificationEmail}
            {disabled}>Send it again.</button
          >
        </div>
      </div>
    {/if}
    <Card class="space-y-3">
      <div class="relative">
        <Field class="pr-9">
          <div class="relative h-6 overflow-x-auto">
            <div class="absolute top-0 left-0 whitespace-nowrap">
              {`UID: ${data.user.uid}`}
            </div>
          </div>
        </Field>
        <div class="absolute top-2.5 right-2">
          <button
            class="text-black transition-colors duration-300 hover:text-gray-700"
            type="button"
            aria-label="Copy user ID to clipboard"
            onclick={() => {
              writeToClipboard(data.user.uid)
            }}
          >
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              ><path
                fill="currentColor"
                d="M5 22q-.825 0-1.413-.588T3 20V7q0-.425.288-.713T4 6q.425 0 .713.288T5 7v13h10q.425 0 .713.288T16 21q0 .425-.288.713T15 22H5Zm4-4q-.825 0-1.413-.588T7 16V4q0-.825.588-1.413T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.588 1.413T18 18H9Zm0-2h9V4H9v12Zm0 0V4v12Z"
              /></svg
            >
          </button>
        </div>
      </div>
      <Field>
        {`Role: ${data.user.role}`}
      </Field>
      <div class="text-sm">
        Any problems with changing your profile? Contact us at <a
          href="mailto:contact@gbstem.org"
          target="_blank"
          rel="noopener"
          class="link">contact@gbstem.org</a
        >.
      </div>
    </Card>
    <ChangeNameForm />
    <ChangeEmailForm />
    <ChangePasswordForm />
    <DeleteAccountForm />
  </div>
</div>
