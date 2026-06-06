<script lang="ts">
  import { superForm, defaults } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'
  import { Field, Control, Label, FieldErrors } from 'formsnap'
  import { alert } from '$lib/stores'
  import { updateProfile } from 'firebase/auth'
  import { user } from '$lib/client/firebase'
  import { onMount } from 'svelte'
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
            <div class="flex gap-2">
              <input
                {...props}
                name="full-name"
                bind:value={$form.fullName}
                type="text"
                placeholder="Full name"
                required
                class="block h-12 w-full appearance-none rounded-md border border-gray-400 px-3 transition-colors placeholder:text-gray-500 focus:border-gray-600 focus:outline-hidden disabled:bg-white disabled:text-gray-400"
              />
              <Button
                class="flex h-12 w-12 shrink-0 items-center justify-center p-0"
                color="blue"
                type="submit"
                disabled={$delayed}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-6 w-6"
                >
                  <path
                    d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                  />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </Button>
            </div>
          {/snippet}
        </Control>
        <FieldErrors class="text-xs text-red-500 font-semibold" />
      </Field>
    </div>
  </fieldset>
</form>
