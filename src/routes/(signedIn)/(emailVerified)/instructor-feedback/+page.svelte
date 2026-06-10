<script lang="ts">
  import { page } from '$app/stores'
  import Button from '$lib/components/Button.svelte'
  import ClassFeedbackDetails from '$lib/components/ClassFeedbackDetails.svelte'
  import CourseFilter from '$lib/components/CourseFilter.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import SearchBox from '$lib/components/SearchBox.svelte'
  import Table from '$lib/components/Table.svelte'
  import { generateCSV } from '$lib/utils'
  import type { PageData } from './$types'

  export let data: PageData
  let dialogEl: Dialog
  let selectedFeedbackId: string | undefined = undefined

  function getAttendancePercent(value: boolean[]) {
    if (!value || value.length === 0) return '0%'
    const attended = value.filter(
      (attended: boolean) => attended === true,
    ).length
    const total = value.length
    return `${Math.round((attended / total) * 100)}%`
  }

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

  const csvHeaders = [
    'id',
    'instructorName',
    'courseName',
    'classNumber',
    'date',
    'feedback',
  ]
  $: csvWithHeaders = generateCSV(
    csvHeaders,
    data.feedback.map((item) => [
      item.id,
      item.instructorName,
      item.courseName,
      item.classNumber,
      item.date,
      item.feedback || '',
    ]),
  )
  $: blob = new Blob([csvWithHeaders], { type: 'text/csv' })
  $: url = URL.createObjectURL(blob)
</script>

<svelte:head>
  <title>Class Feedback</title>
</svelte:head>

<ClassFeedbackDetails bind:dialogEl id={selectedFeedbackId} />

<div class="mb-4 flex flex-wrap items-center gap-4">
  <SearchBox basePath="/instructor-feedback" />
  <CourseFilter paramName="course" />
  <PerPageControl />
  <Button class="flex h-12 items-center"><a href={url}>Download</a></Button>
</div>

<Table>
  <svelte:fragment slot="head">
    <th scope="col" class="px-6 py-3">Instructor Name</th>
    <th scope="col" class="px-6 py-3">Course</th>
    <th scope="col" class="px-6 py-3">Class Number</th>
    <th scope="col" class="px-6 py-3">Date</th>
    <th scope="col" class="px-6 py-3">Attendance Percent</th>
    <th scope="col" class="px-6 py-3">Feedback</th>
  </svelte:fragment>
  <svelte:fragment slot="body">
    {#each data.feedback as value}
      <tr
        class="border-b bg-white hover:cursor-pointer hover:bg-gray-50"
        on:click={() => {
          selectedFeedbackId = value.id
          dialogEl.open()
        }}
      >
        <td class="px-6 py-4">
          {`${value.instructorName}`}
        </td>
        <td class="px-6 py-4">
          {value.courseName}
        </td>
        <td class="px-6 py-4">
          {value.classNumber}
        </td>
        <td class="px-6 py-4">{value.date}</td>
        <td class="px-6 py-4">{getAttendancePercent(value.attendanceList)}</td>
        <td class="px-6 py-4">
          {value.feedback}
        </td>
      </tr>
    {/each}
  </svelte:fragment>
</Table>

{#if !data.query && data.feedback}
  <div class="mt-4 flex justify-end gap-2">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.feedback.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}
