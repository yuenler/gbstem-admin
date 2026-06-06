<script lang="ts">
  import { superForm, defaults } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'
  import { Field, Control, Label, FieldErrors } from 'formsnap'
  import { alert } from '$lib/stores'
  import {
    EmailAuthProvider,
    deleteUser,
    reauthenticateWithCredential,
  } from 'firebase/auth'
  import Dialog from '$lib/components/Dialog.svelte'
  import { user } from '$lib/client/firebase'
  import Button from '../Button.svelte'
  import DialogActions from '../DialogActions.svelte'

  const schema = z.object({
    password: z.string().min(1, 'Password is required'),
  })

  let dialogEl: Dialog

  const formResult = superForm(
    defaults({ password: '' }, zod(schema as any) as any) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      async onUpdate({ form: formVal }) {
        if (!formVal.valid) return
        if ($user) {
          const frozenUser = $user
          try {
            await reauthenticateWithCredential(
              frozenUser.object,
              EmailAuthProvider.credential(
                frozenUser.object.email as string,
                formVal.data.password,
              ),
            )
            await deleteUser(frozenUser.object)
            alert.trigger('success', 'Account was successfully deleted.')
            window.setTimeout(() => {
              location.reload()
            }, 2000)
          } catch (err: any) {
            alert.trigger('error', err.code, true)
          }
        }
      },
    },
  )

  const { form, enhance, delayed, reset } = formResult

  function handleCancel() {
    reset()
    alert.trigger('info', 'Account deletion canceled.')
  }
</script>

<form on:submit|preventDefault={() => dialogEl.open()} class="w-full">
  <span class="font-bold">Delete account</span>
  <div class="mt-2">
    <Button color="red" type="submit">Delete account</Button>
  </div>
</form>

<Dialog bind:this={dialogEl} on:cancel={handleCancel} disabled={$delayed} alert>
  <svelte:fragment slot="title">Delete account</svelte:fragment>
  <div slot="description" class="flex justify-center w-full">
    <form use:enhance class="w-full max-w-lg">
      <fieldset class="space-y-4" disabled={$delayed}>
        <div class="flex justify-center">
          <div class="space-y-4 w-full">
            <div class="flex flex-col gap-1.5">
              <Field form={formResult} name="password">
                <Control>
                  {#snippet children({ props })}
                    <Label class="font-bold text-sm">Password</Label>
                    <input
                      {...props}
                      type="password"
                      bind:value={$form.password}
                      placeholder="Password"
                      required
                      autocomplete="current-password"
                      class="block h-12 w-full appearance-none rounded-md border border-gray-400 px-3 transition-colors placeholder:text-gray-500 focus:border-gray-600 focus:outline-hidden disabled:bg-white disabled:text-gray-400"
                    />
                  {/snippet}
                </Control>
                <FieldErrors class="text-xs text-red-500 font-semibold" />
              </Field>
            </div>
            <div class="font-bold text-red-600 text-center">
              Warning! This is irreversible.
            </div>
          </div>
        </div>
        <DialogActions>
          <Button type="button" on:click={dialogEl.cancel}>Cancel</Button>
          <Button color="red" type="submit" disabled={$delayed}>Delete</Button>
        </DialogActions>
      </fieldset>
    </form>
  </div>
</Dialog>
