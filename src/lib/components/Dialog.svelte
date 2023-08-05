<script lang="ts">
  import clsx from 'clsx'
  import { createEventDispatcher } from 'svelte'
  import { browser } from '$app/environment'
  import { uniqueId } from 'lodash-es'
  import { dialog } from '$lib/stores'
  import { fade } from 'svelte/transition'
  import { clickOutside, trapFocus } from '$lib/utils'

  type Size = 'min' | 'full'

  const dispatch = createEventDispatcher()
  export let size: Size = 'min'
  export let disabled = false
  let openState = false
  export { openState as initial }
  const id = uniqueId('dialog-')
  export let alert = false
  $: if (browser) {
    if (openState) {
      dialog.set(id)
      document.body.style.overflowY = 'hidden'
    } else {
      if ($dialog === id) {
        dialog.set(null)
        document.body.style.overflowY = 'auto'
      }
    }
  }
  export function open() {
    if (!disabled) {
      openState = true
    }
  }
  export function close() {
    if (!disabled) {
      openState = false
    }
  }
  export function cancel() {
    if (!disabled) {
      openState = false
      dispatch('cancel', true)
    }
  }
  function handleEscape(e: KeyboardEvent) {
    if (openState && !disabled) {
      if (e.code === 'Escape') {
        cancel()
      }
    }
  }
</script>

<svelte:body on:keydown|stopPropagation={handleEscape} />

{#if openState}
  <div
    class="fixed inset-0 z-50 h-screen w-screen bg-black opacity-40"
    transition:fade={{ duration: 200 }}
  />
  <div
    class="fixed inset-0 z-50 h-screen w-screen overflow-y-auto"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="relative flex items-end sm:items-center justify-center min-h-screen py-d px-d/2"
    >
      <div
        class={clsx(
          'p-4 sm:p-8 bg-white grid gap-3 sm:gap-6 w-full',
          size === 'full' && 'h-full',
          size === 'min' && 'rounded-lg max-w-2xl',
        )}
        role="dialog"
        use:trapFocus
        use:clickOutside
        on:outclick={() => {
          if (!alert) {
            cancel()
          }
        }}
      >
        <h1
          class="text-xl uppercase bg-gray-200 px-4 py-3 rounded-md font-bold"
        >
          <slot name="title" />
        </h1>
        <slot name="description" />
      </div>
    </div>
  </div>
{/if}
