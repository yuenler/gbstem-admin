<script lang="ts">
  import Select from './Select.svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { coursesJson } from '$lib/data'

  interface Props {
    paramName?: string
  }

  let { paramName = 'filter' }: Props = $props()

  let lastUrlFilter = ''
  let value = $state('')

  $effect(() => {
    const urlFilter = page.url.searchParams.get(paramName) ?? 'all'
    if (urlFilter !== lastUrlFilter) {
      lastUrlFilter = urlFilter
      value = urlFilter
    }
  })

  function handleChange(newValue: string) {
    const urlFilter = page.url.searchParams.get(paramName) ?? 'all'
    if (newValue === urlFilter) return

    const base = new URLSearchParams(page.url.searchParams)
    if (newValue === 'all' || !newValue) {
      base.delete(paramName)
    } else {
      base.set(paramName, newValue)
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

  const options = [
    { name: 'all' },
    ...coursesJson.map((course) => ({ name: course.name })),
  ]
</script>

<Select class="mt-0 w-64" bind:value label="Course" {options} required />
