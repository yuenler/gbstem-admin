<script lang="ts">
  import { goto } from '$app/navigation'
  import { auth } from '$lib/client/firebase'
  import Brand from '$lib/components/Brand.svelte'
  import EmailInput from '$lib/components/EmailInput.svelte'
  import Form from '$lib/components/Form.svelte'
  import PasswordInput from '$lib/components/PasswordInput.svelte'
  import { alert } from '$lib/stores'
  import { cn } from '$lib/utils'
  import { signInWithEmailAndPassword } from 'firebase/auth'
  import Button from '../Button.svelte'
  import Link from '../Link.svelte'

  let disabled = $state(false)
  let showValidation = $state(false)
  let values = $state({
    email: '',
    password: '',
  })

  async function handleSubmit(data: SubmitData) {
    if (data.error === null) {
      showValidation = false
      disabled = true
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          values.email,
          values.password,
        )
        const idToken = await credential.user.getIdToken()
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || 'Unauthorized')
        }
        await goto('/dashboard')
      } catch (err: any) {
        disabled = false
        console.error('Sign in error:', err)
        const isFirebaseError =
          err.code && typeof err.code === 'string' && err.code.includes('/')
        if (isFirebaseError) {
          alert.trigger('error', err.code, true)
        } else {
          alert.trigger('error', err.message || 'Unauthorized')
        }
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
    <h1 class="text-2xl font-bold">Sign in</h1>
    <EmailInput bind:value={values.email} label="Email" required />
    <PasswordInput
      bind:value={values.password}
      label="Password"
      required
      autocomplete="current-password"
    />
    <div class="flex items-center justify-between">
      <Link href="/reset-password">Forgot password?</Link>
      <Button color="blue" type="submit">Sign in</Button>
    </div>
  </fieldset>
</Form>
