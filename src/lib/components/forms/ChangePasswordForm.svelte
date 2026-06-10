<script lang="ts">
  import { superForm, defaults } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'
  import { Field, Control, Label, FieldErrors } from 'formsnap'
  import { alert } from '$lib/stores'
  import { updatePassword } from 'firebase/auth'
  import Dialog from '$lib/components/Dialog.svelte'
  import ReauthenticateForm from '$lib/components/forms/ReauthenticateForm.svelte'
  import { user } from '$lib/client/firebase'
  import DialogActions from '../DialogActions.svelte'
  import Button from '../Button.svelte'

  const schema = z
    .object({
      newPassword: z
        .string()
        .min(6, 'Password must be at least 6-characters long'),
      confirmPassword: z.string().min(1, 'Confirm password is required'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    })

  let dialogEl: Dialog
  let passwordToUpdate = ''

  const formResult = superForm(
    defaults(
      { newPassword: '', confirmPassword: '' },
      zod(schema as any) as any,
    ) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      invalidateAll: false,
      applyAction: false,
      onUpdate({ form: formVal }) {
        if (!formVal.valid) return
        passwordToUpdate = formVal.data.newPassword
        dialogEl.open()
      },
    },
  )

  const { form, enhance, delayed, reset } = formResult

  function handleCancel() {
    reset()
    alert.trigger('info', 'Password change canceled.')
  }

  function handleReauthenticate() {
    if ($user) {
      updatePassword($user.object, passwordToUpdate)
        .then(() => {
          reset()
          dialogEl.close()
          alert.trigger('success', 'Password was successfully changed.')
        })
        .catch((err) => {
          reset()
          dialogEl.close()
          alert.trigger('error', err.code, true)
        })
    }
  }
</script>

<form use:enhance class="w-full">
  <fieldset class="space-y-4" disabled={$delayed}>
    <span class="font-bold">Change password</span>

    <div class="flex flex-col gap-1.5">
      <Field form={formResult} name="newPassword">
        <Control>
          {#snippet children({ props })}
            <Label class="text-sm font-bold">New password</Label>
            <input
              {...props}
              name="new-password"
              type="password"
              bind:value={$form.newPassword}
              placeholder="New password"
              required
              class="block h-12 w-full appearance-none rounded-md border border-gray-400 px-3 transition-colors placeholder:text-gray-500 focus:border-gray-600 focus:outline-hidden disabled:bg-white disabled:text-gray-400"
            />
          {/snippet}
        </Control>
        <FieldErrors class="text-xs font-semibold text-red-500" />
      </Field>
    </div>

    <div class="flex flex-col gap-1.5">
      <Field form={formResult} name="confirmPassword">
        <Control>
          {#snippet children({ props })}
            <Label class="text-sm font-bold">Confirm password</Label>
            <div class="relative">
              <input
                {...props}
                name="confirm-password"
                type="password"
                bind:value={$form.confirmPassword}
                placeholder="Confirm password"
                required
                class="block h-12 w-full appearance-none rounded-md border border-gray-400 px-3 pr-21 transition-colors placeholder:text-gray-500 focus:border-gray-600 focus:outline-hidden disabled:bg-white disabled:text-gray-400"
              />
              <div class="absolute top-0 right-2 flex h-12 items-center">
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
        <FieldErrors class="text-xs font-semibold text-red-500" />
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
