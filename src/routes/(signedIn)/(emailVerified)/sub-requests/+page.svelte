<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import Table from '$lib/components/Table.svelte'
  import { formatDate } from '$lib/utils'
  import Dialog from '$lib/components/Dialog.svelte'
  import Card from '$lib/components/Card.svelte'
  import { SubRequestStatus } from '$lib/data/helpers/SubRequestStatus'
  import Button from '$lib/components/Button.svelte'
  import CourseFilter from '$lib/components/CourseFilter.svelte'
  import SearchBox from '$lib/components/SearchBox.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import type { PageData } from './$types'

  export let data: PageData

  let dialogEl: Dialog[] = []
  $: {
    if (data.subRequests) {
      dialogEl = new Array(data.subRequests.length).fill(null)
    }
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
    if (data.subRequests.length < currentLimit) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage + 1))
    return `?${base.toString()}`
  })()

  // Generate CSV download
  $: csv = data.subRequests
    .map((item) => {
      return [
        item.id,
        item.course,
        item.classNumber,
        item.originalInstructorEmail,
        item.dateOfClass ? item.dateOfClass.toISOString() : '',
        item.subRequestStatus,
        item.subInstructorFirstName,
        item.subInstructorEmail,
        item.notes ? item.notes.replace(/,/g, '') : '',
      ].join(',')
    })
    .join('\n')

  $: csvWithHeaders = `id,course,classNumber,originalInstructorEmail,dateOfClass,subRequestStatus,subInstructorFirstName,subInstructorEmail,notes\n${csv}`
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
          <svelte:fragment slot="title"
            ><div class="flex items-center justify-between">
              Sub Request Notes<Button color="red" on:click={dialogEl[i].cancel}
                >Close</Button
              >
            </div></svelte:fragment
          >
          <Card slot="description">{subRequest.notes}</Card>
        </Dialog>
        <tr
          class={`${subRequest.subRequestStatus === SubRequestStatus.NoSubstituteNeeded ? 'bg-green-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFeedbackNeeded ? 'bg-yellow-100' : subRequest.subRequestStatus === SubRequestStatus.SubstituteFound ? 'bg-blue-100' : 'bg-red-100'} border-b border-white hover:bg-white hover:cursor-pointer`}
          on:click={() => {
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
