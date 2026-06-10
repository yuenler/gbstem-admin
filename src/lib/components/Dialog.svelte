<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { browser } from '$app/environment'
  import { uniqueId } from 'lodash-es'
  import { dialog } from '$lib/stores'
  import { fade } from 'svelte/transition'
  import { clickOutside, trapFocus, cn } from '$lib/utils'

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
      dispatch('open', true)
    }
  }
  export function close() {
    if (!disabled) {
      openState = false
      dispatch('close', true)
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
  ></div>
  <div
    class="fixed inset-0 z-50 h-screen w-screen overflow-y-auto"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="relative flex items-end sm:items-center justify-center min-h-screen py-d px-d/2"
    >
      <div
        class={cn(
          'p-4 sm:p-8 bg-white grid gap-3 sm:gap-6 w-full rounded-lg relative',
          size === 'full' && 'min-h-full h-fit',
          size === 'min' && 'max-w-2xl',
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
        <button
          type="button"
          class="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 z-50 cursor-pointer bg-white rounded-full p-1.5 shadow-sm border border-gray-200 hover:bg-gray-100 transition-colors"
          on:click={cancel}
          {disabled}
          aria-label="Close dialog"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h1
          class="text-xl uppercase bg-gray-200 px-4 py-3 rounded-md font-bold pr-12"
        >
          <slot name="title" />
        </h1>
        <slot name="description" />
      </div>
    </div>
  </div>
{/if}
