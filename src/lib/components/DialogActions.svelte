<script lang="ts">
  import clsx from 'clsx'

  let className = ''
  export { className as class }
</script>

<div
  class={clsx(
    'flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4',
    className,
  )}
>
  <slot />
</div>
