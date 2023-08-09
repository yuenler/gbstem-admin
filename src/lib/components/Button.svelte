<script lang="ts">
  import { cn } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'

  type ButtonColor = 'red' | 'blue' | 'gray' | 'green' | 'yellow'
  type ButtonType = 'button' | 'submit' | 'reset'

  const dispatch = createEventDispatcher<{
    click: MouseEvent & {
      currentTarget: EventTarget & HTMLButtonElement
    }
  }>()

  let className = ''
  export { className as class }
  export let color: ButtonColor = 'gray'
  export let type: ButtonType = 'button'
</script>

<button
  class={cn(
    'rounded-md shadow-sm transition-colors duration-300 px-4 py-2',
    color === 'red' &&
      'bg-red-100 text-red-900 hover:bg-red-200 disabled:bg-red-200 disabled:text-red-700',
    color === 'blue' &&
      'bg-blue-100 text-blue-900 hover:bg-blue-200 disabled:bg-blue-200 disabled:text-blue-700',
    color === 'gray' &&
      'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-200 disabled:text-gray-700',
    color === 'green' &&
      'bg-green-100 text-green-900 hover:bg-green-200 disabled:bg-green-200 disabled:text-green-700',
    color === 'yellow' &&
      'bg-yellow-100 text-yellow-900 hover:bg-yellow-200 disabled:bg-yellow-200 disabled:text-yellow-700',
    className,
  )}
  {type}
  on:click={(e) => dispatch('click', e)}
  {...$$restProps}
>
  <slot />
</button>
