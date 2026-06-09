<script lang="ts">
  import { user } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import { updateProfile } from 'firebase/auth'
  import { Control, Field, FieldErrors } from 'formsnap'
  import { onMount } from 'svelte'
  import { defaults, superForm } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'
  import Button from '../Button.svelte'

  const schema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required'),
  })

  const formResult = superForm(
    defaults({ fullName: '' }, zod(schema as any) as any) as any,
    {
      SPA: true,
      validators: zod(schema as any) as any,
      invalidateAll: false,
      applyAction: false,
      resetForm: false,
      async onUpdate({ form: formVal }) {
        if (!formVal.valid) return
        if ($user) {
          try {
            await updateProfile($user.object, {
              displayName: formVal.data.fullName.trim(),
            })
            alert.trigger('success', 'Name successfully updated.')
          } catch (err: any) {
            alert.trigger('error', 'Failed to update name.')
          }
        }
      },
    },
  )

  const { form, enhance, delayed } = formResult

  onMount(() => {
    return user.subscribe((u) => {
      if (u && u.object.displayName) {
        $form.fullName = u.object.displayName
      }
    })
  })
</script>

<form use:enhance class="w-full">
  <fieldset class="space-y-2" disabled={$delayed}>
    <div class="flex flex-col gap-1.5">
      <Field form={formResult} name="fullName">
        <Control>
          {#snippet children({ props })}
            <span class="font-bold text-sm">Name</span>
            <div class="relative">
              <input
                {...props}
                name="full-name"
                bind:value={$form.fullName}
                type="text"
                placeholder="Full name"
                required
                class="block h-12 w-full appearance-none rounded-md border border-gray-400 px-3 transition-colors placeholder:text-gray-500 focus:border-gray-600 focus:outline-hidden disabled:bg-white disabled:text-gray-400"
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
