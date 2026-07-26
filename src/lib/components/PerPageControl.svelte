<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import Select from './Select.svelte'

  let limitValue = $derived(String(page.url.searchParams.get('limit') ?? '25'))

  function handleLimitChange(newLimit: string) {
    if (newLimit === limitValue) return

    const base = new URLSearchParams(page.url.searchParams)
    base.set('limit', newLimit)
    base.set('page', '1') // Reset to page 1
    goto(`?${base.toString()}`)
  }

  const limitOptions = [
    { name: '25' },
    { name: '50' },
    { name: '100' },
    { name: '200' },
  ]
</script>

<Select
  class="mt-0 w-32"
  value={limitValue}
  onchange={handleLimitChange}
  label="Per Page"
  options={limitOptions}
  required
/>
