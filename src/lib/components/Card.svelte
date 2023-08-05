<script lang="ts">
  import clsx from 'clsx'
  let className = ''
  export { className as class }
</script>

<div
  class={clsx(
    'w-full rounded-md border border-gray-200 p-4 md:p-6 shadow bg-white',
    className,
  )}
>
  <slot />
</div>
