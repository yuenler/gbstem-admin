<script lang="ts">
  import { user } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import { updateProfile } from 'firebase/auth'
  import { onMount } from 'svelte'
  import { defaults, superForm } from 'sveltekit-superforms'
  import { zod } from 'sveltekit-superforms/adapters'
  import { z } from 'zod'
  import Button from '../Button.svelte'
  import FormInput from '../FormInput.svelte'

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
  <fieldset class="space-y-4" disabled={$delayed}>
    <div class="flex items-end gap-2">
      <div class="w-full">
        <FormInput
          form={formResult}
          name="fullName"
          label="Name"
          inputName="full-name"
          bind:value={$form.fullName}
        />
      </div>
      <Button
        class="h-12 shrink-0"
        color="blue"
        type="submit"
        disabled={$delayed}
      >
        Update
      </Button>
    </div>
  </fieldset>
</form>
