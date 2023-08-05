<script lang="ts">
  import clsx from 'clsx'

  let className = ''
  export { className as class }
  export let href = ''
</script>

<a
  class={clsx(
    'inline-block border-b border-black text-black transition-colors duration-300 hover:border-gray-600 hover:text-gray-600',
    className,
  )}
  {href}
  {...$$restProps}
>
  <slot />
</a>
