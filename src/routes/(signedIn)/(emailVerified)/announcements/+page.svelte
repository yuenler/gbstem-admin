<script lang="ts">
  import { page } from '$app/stores'
  import Button from '$lib/components/Button.svelte'
  import Table from '$lib/components/Table.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import { format } from 'date-fns'
  import type { PageData } from './$types'

  export let data: PageData

  $: currentPage = data.page ?? 1
  $: currentLimit = data.limit ?? 25

  $: prevHref = (() => {
    if (currentPage <= 1) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage - 1))
    return `?${base.toString()}`
  })()

  $: nextHref = (() => {
    if (data.announcements.length < currentLimit) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage + 1))
    return `?${base.toString()}`
  })()
</script>

<svelte:head>
  <title>Announcements</title>
</svelte:head>

<h1 class="mb-8 text-5xl font-bold md:text-6xl">Announcements</h1>

<div class="flex flex-wrap items-center gap-4 mb-4">
  <PerPageControl />
</div>

<Table>
  <svelte:fragment slot="head">
    <th scope="col" class="px-6 py-3">Date</th>
    <th scope="col" class="px-6 py-3">Title</th>
    <th scope="col" class="px-6 py-3">Content</th>
  </svelte:fragment>
  <svelte:fragment slot="body">
    {#each data.announcements as announcement}
      <tr class="bg-white border-b hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-gray-400">
          {format(announcement.timestamp, 'yyyy.MM.dd')}
        </td>
        <td class="px-6 py-4 font-semibold text-gray-900">
          {announcement.title}
        </td>
        <td class="px-6 py-4 text-gray-600">
          {announcement.content}
        </td>
      </tr>
    {/each}
  </svelte:fragment>
</Table>

{#if data.announcements}
  <div class="flex justify-end gap-2 mt-4">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.announcements.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}
