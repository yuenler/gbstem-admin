<script lang="ts">
  import { page } from '$app/stores'
  import { addDoc, collection } from 'firebase/firestore'
  import Input from '$lib/components/Input.svelte'
  import Select from '$lib/components/Select.svelte'
  import Form from '$lib/components/Form.svelte'
  import { db } from '$lib/client/firebase'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import { alert } from '$lib/stores'
  import type { FirebaseError } from 'firebase/app'
  import { invalidate } from '$app/navigation'
  import DialogActions from './DialogActions.svelte'
  import { addHours } from 'date-fns'
  import { cn } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()
  let dialogEl: Dialog
  let showValidation = false
  let disabled = false
  let values: {
    role: Data.Role
    consumable: boolean
    expires: number
  } = {
    role: 'reviewer',
    consumable: false,
    expires: 24,
  }
  function handleSubmit(e: CustomEvent<SubmitData>) {
    if (e.detail.error === null) {
      showValidation = false
      disabled = true
      addDoc(collection(db, 'tokens'), {
        role: values.role,
        consumable: values.consumable,
        expires: addHours(new Date(), values.expires),
        consumers: [],
      } as Data.Token<'pojo'>)
        .then((snapshot) => {
          invalidate('app:applications').then(() => {
            navigator.clipboard
              .writeText(`${$page.url.host}/signup?token=${snapshot.id}`)
              .then(() => {
                invalidate('app:tokens').then(() => {
                  alert.trigger('success', 'Changes were saved successfully.')
                  dialogEl.close()
                })
              })
          })
        })
        .catch((err: FirebaseError) => {
          console.log(err)
          alert.trigger('error', err.code, true)
          disabled = false
        })
    } else {
      showValidation = true
      alert.trigger('error', e.detail.error)
    }
  }
  function handleExit() {
    dispatch('exit', true)
  }
</script>

<Dialog
  bind:this={dialogEl}
  alert
  initial
  on:cancel={handleExit}
  on:close={handleExit}
>
  <svelte:fragment slot="title">Token</svelte:fragment>
  <div slot="description">
    <Form
      class={cn(showValidation && 'show-validation')}
      on:submit={handleSubmit}
    >
      <fieldset class="space-y-4" {disabled}>
        <div class="flex justify-center">
          <div class="space-y-4 max-w-lg">
            <Select
              bind:value={values.role}
              label="What role should this token grant?"
              options={[{ name: 'reviewer' }, { name: 'admin' }]}
              required
            />
            <div>
              <Input
                type="checkbox"
                bind:value={values.consumable}
                label="Should this token be one-time use?"
              />
              <p class="text-sm mt-2 leading-tight">
                After one account is created with this token, no one else can
                use the token to sign up.
              </p>
            </div>
            <div>
              <Input
                type="number"
                bind:value={values.expires}
                label="After how many hours should this token expire?"
                min="1"
                max="48"
                required
              />
              <span class="text-sm">Maximum is 48 hours.</span>
            </div>
          </div>
        </div>
        <DialogActions>
          <Button on:click={dialogEl.cancel}>Cancel</Button>
          <Button type="submit" color="blue">Create</Button>
        </DialogActions>
      </fieldset>
    </Form>
  </div>
</Dialog>
