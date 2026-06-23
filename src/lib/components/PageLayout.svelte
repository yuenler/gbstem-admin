<script lang="ts">
  import { cn } from '$lib/utils'
  export let cols: 2 | 3 = 3
</script>

<div
  class={cn(
    'grid',
    cols === 2 && 'md:grid-cols-2',
    cols === 3 && 'md:grid-cols-3',
  )}
>
  <h1 class="mb-8 text-5xl font-bold md:text-6xl">
    <slot name="title" />
  </h1>
  <div class={cn('flex flex-col items-center', cols === 3 && 'md:col-span-2')}>
    <slot />
  </div>
</div>
