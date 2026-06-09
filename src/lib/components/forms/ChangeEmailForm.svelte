<script lang="ts">
  import type { ActionRequestBody } from '../../../routes/api/action/+server'
  import { superForm, defaults } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'
  import { Field, Control, Label, FieldErrors } from 'formsnap'
  import { alert } from '$lib/stores'
  import Dialog from '$lib/components/Dialog.svelte'
  import ReauthenticateForm from '$lib/components/forms/ReauthenticateForm.svelte'
  import { user } from '$lib/client/firebase'
  import DialogActions from '../DialogActions.svelte'
  import Button from '../Button.svelte'

  const schema = z.object({
    newEmail: z.string().email('Invalid email address'),
  })

  let dialogEl: Dialog
  let emailToUpdate = ''

  const formResult = superForm(
    defaults({ newEmail: '' }, zod(schema as any) as any) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      invalidateAll: false,
      applyAction: false,
      onUpdate({ form: formVal }) {
        if (!formVal.valid) return
        emailToUpdate = formVal.data.newEmail
        dialogEl.open()
      },
    },
  )

  const { form, enhance, delayed, reset } = formResult

  function handleCancel() {
    reset()
    alert.trigger('info', 'Email change canceled.')
  }

  function handleReauthenticate() {
    if ($user) {
      dialogEl.close()
      const payload: ActionRequestBody = {
        type: 'changeEmail',
        newEmail: emailToUpdate,
      }
      fetch('/api/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (res.ok) {
          alert.trigger('info', 'A verification email was sent.')
        } else {
          const { message } = await res.json()
          alert.trigger('error', message)
        }
        reset()
      })
    }
  }
</script>

<form use:enhance class="w-full">
  <fieldset class="space-y-4" disabled={$delayed}>
    <span class="font-bold">Change email</span>

    <div class="flex flex-col gap-1.5">
      <label class="font-bold text-sm" for="current-email">Current email</label>
      <input
        id="current-email"
        type="email"
        value={$user && $user.object.email ? $user.object.email : ''}
        readonly
        disabled
        class="block h-12 w-full appearance-none rounded-md border border-gray-300 bg-gray-50 px-3 text-gray-500 outline-hidden"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <Field form={formResult} name="newEmail">
        <Control>
          {#snippet children({ props })}
            <Label class="font-bold text-sm">New email</Label>
            <div class="relative">
              <input
                {...props}
                name="new-email"
                type="email"
                bind:value={$form.newEmail}
                placeholder="New email"
                required
                class="block h-12 w-full appearance-none rounded-md border border-gray-400 px-3 pr-21 transition-colors placeholder:text-gray-500 focus:border-gray-600 focus:outline-hidden disabled:bg-white disabled:text-gray-400"
              />
              <div class="absolute right-2 top-0 flex h-12 items-center">
                <Button
                  color="blue"
                  class="px-2 py-1"
                  type="submit"
                  disabled={$delayed}>Update</Button
                >
              </div>
            </div>
          {/snippet}
        </Control>
        <FieldErrors class="text-xs text-red-500 font-semibold" />
      </Field>
    </div>
  </fieldset>
</form>

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
