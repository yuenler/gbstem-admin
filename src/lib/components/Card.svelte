<script lang="ts">
  import { cn } from '$lib/utils'

  let className = ''
  export { className as class }
</script>

<div
  class={cn(
    'w-full rounded-md border border-gray-200 p-4 md:p-6 shadow bg-white',
    className,
  )}
>
  <slot />
</div>
