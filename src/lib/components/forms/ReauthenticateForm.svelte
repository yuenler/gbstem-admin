<script lang="ts">
  import { superForm, defaults } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'
  import { Field, Control, Label, FieldErrors } from 'formsnap'
  import { user } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import {
    EmailAuthProvider,
    reauthenticateWithCredential,
  } from 'firebase/auth'
  import { createEventDispatcher } from 'svelte'
  interface Props {
    children?: import('svelte').Snippet
  }

  let { children }: Props = $props()

  const dispatch = createEventDispatcher<{
    reauthenticate: boolean
  }>()

  const schema = z.object({
    password: z.string().min(1, 'Password is required'),
  })

  const formResult = superForm(
    defaults({ password: '' }, zod(schema as any) as any) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      async onUpdate({ form: formVal }) {
        if (!formVal.valid) return
        if ($user) {
          try {
            await reauthenticateWithCredential(
              $user.object,
              EmailAuthProvider.credential(
                $user.object.email as string,
                formVal.data.password,
              ),
            )
            dispatch('reauthenticate', true)
          } catch (err: any) {
            alert.trigger('error', err.code, true)
          }
        }
      },
    },
  )

  const { form, enhance, delayed } = formResult
</script>

<form use:enhance class="w-full">
  <fieldset class="space-y-4" disabled={$delayed}>
    <div class="flex flex-col gap-1.5">
      <Field form={formResult} name="password">
        <Control>
          {#snippet children({ props })}
            <Label class="text-sm font-bold">Password</Label>
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
        <FieldErrors class="text-xs font-semibold text-red-500" />
      </Field>
    </div>

    {@render children?.()}
  </fieldset>
</form>
