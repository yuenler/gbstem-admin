<script lang="ts">
  import Select from './Select.svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'

  interface Props {
    type: 'students' | 'registrations' | 'applications'
  }

  let { type }: Props = $props()

  let defaultFilter = $derived(type === 'registrations' ? 'submitted' : 'all')

  let value = $derived(page.url.searchParams.get('filter') ?? defaultFilter)

  function handleChange(newValue: string) {
    if (newValue === value) return

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

<Select
  class="mt-0 w-64"
  {value}
  onchange={handleChange}
  {label}
  {options}
  required
/>
