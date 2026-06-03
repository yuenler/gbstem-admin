<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import Table from '$lib/components/Table.svelte'
  import CourseFilter from '$lib/components/CourseFilter.svelte'
  import SearchBox from '$lib/components/SearchBox.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import Button from '$lib/components/Button.svelte'
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
    if (data.feedback.length < currentLimit) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage + 1))
    return `?${base.toString()}`
  })()

  // Generate CSV download
  $: csv = data.feedback
    .map((item) => {
      return [
        item.id,
        item.studentName,
        item.course,
        item.instructorName,
        item.date,
        item.feedback ? item.feedback.replace(/,/g, '') : '',
        item.rating,
      ].join(',')
    })
    .join('\n')

  $: csvWithHeaders = `id,studentName,course,instructorName,date,feedback,rating\n${csv}`
  $: blob = new Blob([csvWithHeaders], { type: 'text/csv' })
  $: url = URL.createObjectURL(blob)
</script>

<svelte:head>
  <title>Student Feedback</title>
</svelte:head>

<div class="flex flex-wrap items-center gap-4 mb-4">
  <SearchBox basePath="/student-feedback" />
  <CourseFilter paramName="course" />
  <PerPageControl />
  <Button class="h-12 flex items-center"><a href={url}>Download</a></Button>
</div>

<Table>
  <svelte:fragment slot="head">
    <th scope="col" class="px-6 py-3">Student Name</th>
    <th scope="col" class="px-6 py-3">Course</th>
    <th scope="col" class="px-6 py-3">Instructor Name</th>
    <th scope="col" class="px-6 py-3">Date</th>
    <th scope="col" class="px-6 py-3">Feedback</th>
    <th scope="col" class="px-6 py-3">Rating</th>
  </svelte:fragment>
  <svelte:fragment slot="body">
    {#each data.feedback as value}
      <tr class="bg-white border-b hover:bg-gray-50 hover:cursor-pointer">
        <td class="px-6 py-4"> {value.studentName} </td>
        <td class="px-6 py-4">
          {value.course}
        </td>
        <td class="px-6 py-4">
          {value.instructorName}
        </td>
        <td class="px-6 py-4">{value.date}</td>
        <td class="px-6 py-4">
          {value.feedback}
        </td>
        <td class="px-6 py-4">
          {value.rating}
        </td>
      </tr>
    {/each}
  </svelte:fragment>
</Table>

{#if !data.query && data.feedback}
  <div class="flex justify-end gap-2 mt-4">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.feedback.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}
