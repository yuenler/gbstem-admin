<script lang="ts">
  import { cn } from '$lib/utils'

  interface Props {
    class?: string
    children?: import('svelte').Snippet
  }

  let { class: className = '', children }: Props = $props()
</script>

<div
  class={cn(
    'w-full rounded-md border border-gray-200 p-4 md:p-6 shadow-sm bg-white',
    className,
  )}
>
  {@render children?.()}
</div>
