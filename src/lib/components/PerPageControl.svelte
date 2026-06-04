<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import Select from './Select.svelte'

  let previousUrlLimit = String($page.url.searchParams.get('limit') ?? '25')
  let limitValue = previousUrlLimit

  $: {
    const urlLimit = String($page.url.searchParams.get('limit') ?? '25')
    if (urlLimit !== previousUrlLimit) {
      previousUrlLimit = urlLimit
      limitValue = urlLimit
    } else if (limitValue !== urlLimit) {
      handleLimitChange(limitValue)
    }
  }

  function handleLimitChange(newLimit: string) {
    const urlLimit = String($page.url.searchParams.get('limit') ?? '25')
    if (newLimit === urlLimit) return

    const base = new URLSearchParams($page.url.searchParams)
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
  bind:value={limitValue}
  label="Per Page"
  options={limitOptions}
  floating
  required
/>
