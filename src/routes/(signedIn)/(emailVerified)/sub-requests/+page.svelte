<script lang="ts">
  import { page } from '$app/stores'
  import Button from '$lib/components/Button.svelte'
  import Card from '$lib/components/Card.svelte'
  import CourseFilter from '$lib/components/CourseFilter.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import SearchBox from '$lib/components/SearchBox.svelte'
  import Table from '$lib/components/Table.svelte'
  import { SubRequestStatus } from '$lib/data/helpers/SubRequestStatus'
  import { formatDate, generateCSV } from '$lib/utils'
  import type { PageData } from './$types'

  export let data: PageData

  let dialogEl: Dialog[] = []

  $: currentPage = data.page ?? 1
  $: currentLimit = data.limit ?? 25

  $: prevHref = (() => {
    if (currentPage <= 1) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage - 1))
    return `?${base.toString()}`
  })()

  $: nextHref = (() => {
    if (data.subRequests.length < currentLimit) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage + 1))
    return `?${base.toString()}`
  })()

  const csvHeaders = [
    'id',
    'course',
    'classNumber',
    'originalInstructorEmail',
    'dateOfClass',
    'subRequestStatus',
    'subInstructorFirstName',
    'subInstructorEmail',
    'notes',
  ]
  $: csvWithHeaders = generateCSV(
    csvHeaders,
    data.subRequests.map((item) => [
      item.id,
      item.course,
      item.classNumber,
      item.originalInstructorEmail,
      item.dateOfClass ? item.dateOfClass.toISOString() : '',
      item.subRequestStatus,
      item.subInstructorFirstName,
      item.subInstructorEmail,
      item.notes || '',
    ]),
  )
  $: blob = new Blob([csvWithHeaders], { type: 'text/csv' })
  $: url = URL.createObjectURL(blob)
</script>

<svelte:head>
  <title>Sub Requests Log</title>
</svelte:head>

<div class="flex flex-wrap items-center gap-4 mb-4">
  <SearchBox basePath="/sub-requests" />
  <CourseFilter paramName="course" />
  <PerPageControl />
  <Button class="h-12 flex items-center"><a href={url}>Download</a></Button>
</div>

<div>
  <Table>
    <svelte:fragment slot="head">
      <th scope="col" class="px-6 py-3">Class</th>
      <th scope="col" class="px-6 py-3">Original Instructor Email</th>
      <th scope="col" class="px-6 py-3">Date Of Class</th>
      <th scope="col" class="px-6 py-3">Request Status</th>
      <th scope="col" class="px-6 py-3">Substitute Instructor</th>
      <th scope="col" class="px-6 py-3">Substitute Instructor Email</th>
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#each data.subRequests as subRequest, i}
        <Dialog bind:this={dialogEl[i]}>
          <svelte:fragment slot="title">
            <div class="flex items-center justify-between">
              Sub Request Notes
              <Button color="red" on:click={dialogEl[i].cancel}>Close</Button>
            </div>
          </svelte:fragment>
          <Card slot="description">{subRequest.notes}</Card>
        </Dialog>
        <tr
          class={`${subRequest.subRequestStatus === SubRequestStatus.NoSubstituteNeeded ? 'bg-green-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFeedbackNeeded ? 'bg-yellow-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFound ? 'bg-blue-100' : 'bg-red-100'} border-b border-white hover:bg-white hover:cursor-pointer`}
          on:click={(e) => {
            e.stopPropagation()
            if (dialogEl[i]) {
              dialogEl[i].open()
            }
          }}
        >
          <td class="px-6 py-4">
            {subRequest.course + ', Class #' + subRequest.classNumber}
          </td>
          <td class="px-6 py-4">
            {subRequest.originalInstructorEmail}
          </td>
          <td class="px-6 py-4">
            {subRequest.dateOfClass ? formatDate(subRequest.dateOfClass) : ''}
          </td>
          <td class="px-6 py-4">
            {subRequest.subRequestStatus}
          </td>
          <td class="px-6 py-4">
            {subRequest.subInstructorFirstName}
          </td>
          <td class="px-6 py-4">
            {subRequest.subInstructorEmail}
          </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
</div>

{#if !data.query && data.subRequests}
  <div class="flex justify-end gap-2 mt-4">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.subRequests.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}
