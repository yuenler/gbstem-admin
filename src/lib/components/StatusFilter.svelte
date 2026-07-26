<script lang="ts">
  import Select from './Select.svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'

  interface Props {
    type: 'students' | 'registrations' | 'applications'
  }

  let { type }: Props = $props()

  let defaultFilter = $derived(type === 'registrations' ? 'submitted' : 'all')

  let lastUrlFilter = ''
  let value = $state('')

  $effect(() => {
    const urlFilter = page.url.searchParams.get('filter') ?? defaultFilter
    if (urlFilter !== lastUrlFilter) {
      lastUrlFilter = urlFilter
      value = urlFilter
    }
  })

  function handleChange(newValue: string) {
    const urlFilter = page.url.searchParams.get('filter') ?? defaultFilter
    if (newValue === urlFilter) return

    const base = new URLSearchParams(page.url.searchParams)
    if (newValue === defaultFilter || !newValue) {
      base.delete('filter')
    } else {
      base.set('filter', newValue)
    }
    base.delete('updated') // Reset pagination
    base.delete('page') // Reset page parameter
    goto(`?${base.toString()}`)
  }

  $effect(() => {
    if (value) {
      handleChange(value)
    }
  })

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

  let options = $derived(optionsMap[type])
  let label = $derived(labelMap[type])
</script>

<Select class="mt-0 w-64" bind:value {label} {options} required />
