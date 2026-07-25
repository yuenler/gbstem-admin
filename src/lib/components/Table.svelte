<script lang="ts">
  interface Props {
    head?: import('svelte').Snippet
    body?: import('svelte').Snippet
  }

  let { head, body }: Props = $props()
</script>

<div class="relative mt-4 overflow-x-auto rounded-md border-gray-200 shadow-sm">
  <table class="w-full text-left text-sm text-gray-500">
    <thead class="bg-gray-100 text-xs text-gray-700 uppercase">
      <tr>
        {@render head?.()}
      </tr>
    </thead>
    <tbody>
      {@render body?.()}
    </tbody>
  </table>
</div>
