<script lang="ts">
  import Input from '$lib/components/Input.svelte'
  import { cn } from '$lib/utils'
  import { auth } from '$lib/client/firebase'
  import { alert } from '$lib/stores'
  import Brand from '$lib/components/Brand.svelte'
  import Form from '$lib/components/Form.svelte'
  import { signInWithEmailAndPassword } from 'firebase/auth'
  import { goto } from '$app/navigation'
  import Link from '../Link.svelte'
  import Button from '../Button.svelte'

  let disabled = false
  let showValidation = false
  let values = {
    email: '',
    password: '',
  }

  function handleSubmit(e: CustomEvent<SubmitData>) {
    if (e.detail.error === null) {
      showValidation = false
      disabled = true
      signInWithEmailAndPassword(auth, values.email, values.password)
        .then((credential) => {
          return credential.user.getIdToken().then((idToken) => {
            return fetch('/api/auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ idToken }),
            })
          })
        })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.message || 'Unauthorized')
          }
          await goto('/dashboard')
        })
        .catch((err) => {
          disabled = false
          console.error('Sign in error:', err)
          const isFirebaseError =
            err.code && typeof err.code === 'string' && err.code.includes('/')
          if (isFirebaseError) {
            alert.trigger('error', err.code, true)
          } else {
            alert.trigger('error', err.message || 'Unauthorized')
          }
        })
    } else {
      showValidation = true
      alert.trigger('error', e.detail.error)
    }
  }
</script>

<Form
  class={cn('max-w-lg', showValidation && 'show-validation')}
  on:submit={handleSubmit}
>
  <fieldset class="space-y-4" {disabled}>
    <Brand />
    <h1 class="text-2xl font-bold">Sign in</h1>
    <Input type="email" bind:value={values.email} label="Email" required />
    <Input
      type="password"
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
