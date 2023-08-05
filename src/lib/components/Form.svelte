<script lang="ts">
  import clsx from 'clsx'
  import { createEventDispatcher } from 'svelte'

  export let className: string
  export { className as class }

  const dispatch = createEventDispatcher<{
    submit: SubmitData
  }>()
  let self: HTMLFormElement

  function handleSubmit(e: SubmitEvent) {
    const state = [
      ...Array.from(self.querySelectorAll('input')),
      ...Array.from(self.querySelectorAll('textarea')),
    ].find((el) => !el.checkValidity())
    dispatch('submit', {
      event: e,
      error: state === undefined ? null : state.validationMessage,
    })
  }
</script>

<form
  class={clsx('w-full', className)}
  novalidate
  bind:this={self}
  on:submit|preventDefault={handleSubmit}
  {...$$restProps}
>
  <slot />
</form>
