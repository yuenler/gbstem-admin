<script lang="ts">
  import clsx from 'clsx'
  import { createEventDispatcher } from 'svelte'

  type ButtonColor = 'red' | 'blue' | 'gray'
  type ButtonPadding = string | boolean
  type ButtonType = 'button' | 'submit' | 'reset'

  const dispatch = createEventDispatcher<{
    click: MouseEvent & {
      currentTarget: EventTarget & HTMLButtonElement
    }
  }>()

  let className = ''
  export { className as class }
  export let padding: ButtonPadding = true
  export let color: ButtonColor = 'gray'
  export let type: ButtonType = 'button'
</script>

<button
  class={clsx(
    className,
    typeof padding === 'boolean' && padding && 'px-4 py-2',
    typeof padding === 'string' && padding,
    color === 'red' &&
      'rounded-md bg-red-100 text-red-900 shadow-sm transition-colors duration-300 hover:bg-red-200 disabled:bg-red-200 disabled:text-red-700',
    color === 'blue' &&
      'rounded-md bg-blue-100 text-blue-900 shadow-sm transition-colors duration-300 hover:bg-blue-200 disabled:bg-blue-200 disabled:text-blue-700',
    color === 'gray' &&
      'rounded-md bg-gray-100 text-gray-900 shadow-sm transition-colors duration-300 hover:bg-gray-200 disabled:bg-gray-200 disabled:text-gray-700',
  )}
  {type}
  on:click={(e) => dispatch('click', e)}
  {...$$restProps}
>
  <slot />
</button>
