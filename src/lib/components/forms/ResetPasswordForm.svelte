<script lang="ts">
  import type { ActionRequestBody } from '../../../routes/api/action/+server'
  import Input from '$lib/components/Input.svelte'
  import { cn } from '$lib/utils'
  import { alert } from '$lib/stores'
  import Brand from '$lib/components/Brand.svelte'
  import Form from '$lib/components/Form.svelte'
  import Link from '$lib/components/Link.svelte'
  import Button from '../Button.svelte'

  let disabled = $state(false)
  let showValidation = $state(false)
  let values = $state({
    email: '',
  })
  async function handleSubmit(data: SubmitData) {
    if (data.error === null) {
      showValidation = false
      disabled = true
      const payload: ActionRequestBody = {
        type: 'resetPassword',
        email: values.email,
      }
      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          alert.trigger(
            'info',
            'Password reset email was sent. Please check your inbox.',
          )
        } else {
          const { message } = await res.json()
          alert.trigger('error', message)
        }
      } catch (err: any) {
        console.error('Password reset error:', err)
        alert.trigger('error', err.message || 'An error occurred.')
      } finally {
        values = {
          email: '',
        }
        disabled = false
      }
    } else {
      showValidation = true
      alert.trigger('error', data.error)
    }
  }
</script>

<Form
  class={cn('max-w-lg', showValidation && 'show-validation')}
  onSubmit={handleSubmit}
>
  <fieldset class="space-y-4" {disabled}>
    <Brand />
    <h1 class="text-2xl font-bold">Reset password</h1>
    <Input type="email" bind:value={values.email} label="Email" required />
    <div class="flex items-center justify-between">
      <span>
        <Link href="/signup">Sign up</Link> or
        <Link href="/signin">sign in</Link>.
      </span>
      <Button color="blue" type="submit">Send email</Button>
    </div>
  </fieldset>
</Form>
