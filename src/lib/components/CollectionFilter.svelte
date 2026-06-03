<script lang="ts">
  import Select from './Select.svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import {
    registrationsCollection,
    applicationsCollection,
  } from '$lib/data/collections'
  import collectionsList from '$lib/data/collectionsList.json'

  export let type: 'registrations' | 'applications'

  const defaultCollection =
    type === 'registrations' ? registrationsCollection : applicationsCollection

  const valueToName: Record<string, string> = {}
  const nameToValue: Record<string, string> = {}
  for (const col of collectionsList) {
    valueToName[`${type}${col.id}`] = col.name
    nameToValue[col.name] = `${type}${col.id}`
  }

  const defaultDisplayName = collectionsList[0]?.name ?? 'Spring 2026'

  let lastUrlDisplayName =
    valueToName[
      $page.url.searchParams.get('collection') ?? defaultCollection
    ] ?? defaultDisplayName
  let displayName = lastUrlDisplayName

  $: {
    const urlCollection =
      $page.url.searchParams.get('collection') ?? defaultCollection
    const urlName = valueToName[urlCollection] ?? defaultDisplayName
    if (urlName !== lastUrlDisplayName) {
      lastUrlDisplayName = urlName
      displayName = urlName
    }
  }

  function handleChange(newDisplayName: string) {
    const urlCollection =
      $page.url.searchParams.get('collection') ?? defaultCollection
    const targetValue = nameToValue[newDisplayName] ?? defaultCollection
    if (targetValue === urlCollection) return

    const base = new URLSearchParams($page.url.searchParams)
    base.set('collection', targetValue)
    base.delete('updated') // Reset pagination
    base.delete('page') // Reset page parameter
    goto(`?${base.toString()}`)
  }

  $: if (displayName) {
    handleChange(displayName)
  }

  const options = collectionsList.map((col) => ({ name: col.name }))
</script>

<Select
  class="mt-0 w-64"
  bind:value={displayName}
  label="Collection"
  {options}
  floating
  required
/>
