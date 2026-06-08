<script lang="ts">
  import Select from './Select.svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  export let type: 'students' | 'registrations' | 'applications'

  let lastUrlFilter = $page.url.searchParams.get('filter') ?? 'all'
  let value = lastUrlFilter

  $: {
    const urlFilter = $page.url.searchParams.get('filter') ?? 'all'
    if (urlFilter !== lastUrlFilter) {
      lastUrlFilter = urlFilter
      value = urlFilter
    }
  }

  function handleChange(newValue: string) {
    const urlFilter = $page.url.searchParams.get('filter') ?? 'all'
    if (newValue === urlFilter) return

    const base = new URLSearchParams($page.url.searchParams)
    if (newValue === 'all' || !newValue) {
      base.delete('filter')
    } else {
      base.set('filter', newValue)
    }
    base.delete('updated') // Reset pagination
    base.delete('page') // Reset page parameter
    goto(`?${base.toString()}`)
  }

  $: if (value) {
    handleChange(value)
  }

  const optionsMap = {
    students: [{ name: 'all' }, { name: 'submitted' }, { name: 'enrolled' }],
    registrations: [
      { name: 'all' },
      { name: 'submitted' },
      { name: 'enrolled' },
      { name: 'inPerson' },
      { name: 'incomplete' },
      { name: 'not enrolled' },
    ],
    applications: [
      { name: 'all' },
      { name: 'undecided' },
      { name: 'inPerson' },
      { name: 'incomplete' },
      { name: 'complete' },
    ],
  }

  const labelMap = {
    students: 'Status',
    registrations: 'Status',
    applications: 'Decision',
  }

  $: options = optionsMap[type]
  $: label = labelMap[type]
</script>

<Select class="mt-0 w-64" bind:value {label} {options} required />
