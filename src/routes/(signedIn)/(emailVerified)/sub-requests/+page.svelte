<script lang="ts">
  import { page } from '$app/state'
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

  interface Props {
    data: PageData
  }

  let { data }: Props = $props()

  let dialogEl: Dialog[] = $state([])

  let currentPage = $derived(data.page ?? 1)
  let currentLimit = $derived(data.limit ?? 25)

  let prevHref = $derived(
    (() => {
      if (currentPage <= 1) return ''
      const base = new URLSearchParams(page.url.searchParams)
      base.set('page', String(currentPage - 1))
      return `?${base.toString()}`
    })(),
  )

  let nextHref = $derived(
    (() => {
      if (data.subRequests.length < currentLimit) return ''
      const base = new URLSearchParams(page.url.searchParams)
      base.set('page', String(currentPage + 1))
      return `?${base.toString()}`
    })(),
  )

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
  let csvWithHeaders = $derived(
    generateCSV(
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
    ),
  )
  let blob = $derived(new Blob([csvWithHeaders], { type: 'text/csv' }))
  let url = $derived(URL.createObjectURL(blob))
</script>

<svelte:head>
  <title>Sub Requests Log</title>
</svelte:head>

<div class="mb-4 flex flex-wrap items-end gap-4">
  <SearchBox basePath="/sub-requests" />
  <CourseFilter paramName="course" />
  <PerPageControl />
  <Button class="flex h-12 items-center" href={url} download="sub-requests.csv"
    >Download</Button
  >
</div>

<div>
  <Table>
    {#snippet head()}
      <th scope="col" class="px-6 py-3">Class</th>
      <th scope="col" class="px-6 py-3">Original Instructor Email</th>
      <th scope="col" class="px-6 py-3">Date Of Class</th>
      <th scope="col" class="px-6 py-3">Request Status</th>
      <th scope="col" class="px-6 py-3">Substitute Instructor</th>
      <th scope="col" class="px-6 py-3">Substitute Instructor Email</th>
    {/snippet}
    {#snippet body()}
      {#each data.subRequests as subRequest, i (subRequest.id)}
        <Dialog bind:this={dialogEl[i]}>
          {#snippet title()}
            <div class="flex items-center justify-between">
              Sub Request Notes
              <Button color="red" onclick={() => dialogEl[i]?.cancel()}
                >Close</Button
              >
            </div>
          {/snippet}
          {#snippet description()}
            <Card>{subRequest.notes}</Card>
          {/snippet}
        </Dialog>
        <tr
          class={`${subRequest.subRequestStatus === SubRequestStatus.NoSubstituteNeeded ? 'bg-green-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFeedbackNeeded ? 'bg-yellow-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFound ? 'bg-blue-100' : 'bg-red-100'} border-b border-white hover:bg-white hover:cursor-pointer`}
          onclick={(e) => {
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
    {/snippet}
  </Table>
</div>

{#if !data.query && data.subRequests}
  <div class="mt-4 flex justify-end gap-2">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.subRequests.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}
