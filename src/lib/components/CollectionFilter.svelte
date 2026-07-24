<script lang="ts">
  import Select from './Select.svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { currentSemester, resolveSemester } from '$lib/data/collections'
  import collectionsList from '$lib/data/collectionsList.json'

  const idToName: Record<string, string> = {}
  const nameToId: Record<string, string> = {}
  for (const sem of collectionsList) {
    idToName[sem.id] = sem.name
    nameToId[sem.name] = sem.id
  }

  // lib/data/collectionsList.json should be ordered from the most recent
  // semester to the oldest, so that the default semester shown in the
  // dropdown is the most recent one.
  const defaultDisplayName =
    idToName[currentSemester] ?? collectionsList[0]?.name ?? 'ERROR'

  let lastUrlDisplayName =
    idToName[resolveSemester($page.url.searchParams.get('semester'))] ??
    defaultDisplayName
  let displayName = lastUrlDisplayName

  $: {
    const urlSemester = resolveSemester($page.url.searchParams.get('semester'))
    const urlName = idToName[urlSemester] ?? defaultDisplayName
    if (urlName !== lastUrlDisplayName) {
      lastUrlDisplayName = urlName
      displayName = urlName
    }
  }

  function handleChange(newDisplayName: string) {
    const urlSemester = resolveSemester($page.url.searchParams.get('semester'))
    const targetId = nameToId[newDisplayName] ?? currentSemester
    if (targetId === urlSemester) return

    const base = new URLSearchParams($page.url.searchParams)
    base.set('semester', targetId)
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
  required
/>
