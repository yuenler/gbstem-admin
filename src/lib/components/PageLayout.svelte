<script lang="ts">
  import clsx from 'clsx'
  export let cols: 2 | 3 = 3
</script>

<div
  class={clsx(
    'grid',
    cols === 2 && 'md:grid-cols-2',
    cols === 3 && 'md:grid-cols-3',
  )}
>
  <h1 class="mb-8 text-5xl font-bold md:text-6xl">
    <slot name="title" />
  </h1>
  <div
    class={clsx('flex flex-col items-center', cols === 3 && 'md:col-span-2')}
  >
    <slot />
  </div>
</div>
