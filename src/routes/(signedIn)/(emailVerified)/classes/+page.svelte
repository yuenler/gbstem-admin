<script lang="ts">
  import CourseFilter from '$lib/components/CourseFilter.svelte'
  import Table from '$lib/components/Table.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import { copyEmails, formatTime24to12 } from '$lib/utils'
  import { format } from 'date-fns'
  import ClassDetails from '$lib/components/ClassDetails.svelte'
  import type { PageData } from './$types'
  import Button from '$lib/components/Button.svelte'
  import SearchBox from '$lib/components/SearchBox.svelte'
  import { ClassStatus } from '$lib/data/types/ClassStatus'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'

  export let data: PageData
  let showValidation = false
  let currentUser: Data.User.Store
  let scheduled = false
  let loading = true
  let selectedClassId: string | undefined = undefined
  let checked: Array<number> = []
  let dialogEl: Dialog

  $: currentPage = data.page ?? 1
  $: currentLimit = data.limit ?? 25

  $: prevHref = (() => {
    if (currentPage <= 1) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage - 1))
    return `?${base.toString()}`
  })()

  $: nextHref = (() => {
    if (data.classes && data.classes.length < currentLimit) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage + 1))
    return `?${base.toString()}`
  })()

  const csv = data.classes
    .map((classes) => {
      const {
        id,
        name,
        email,
        courses,
        students,
        classStatuses,
        meetingLink,
        classTimes,
      } = classes
      return [
        id,
        name,
        email,
        courses,
        students.join(', '),
        classStatuses.filter(
          (status) => status === ClassStatus.EverythingComplete,
        ).length,
        classStatuses.filter(
          (status) => status === ClassStatus.FeedbackIncomplete,
        ).length,
        classStatuses.filter((status) => status === ClassStatus.ClassNotHeld)
          .length,
        meetingLink,
        classTimes.map((value) => value.toString()).join(', '),
      ].join(',')
    })
    .join('\n')

  const csvWithHeaders = `id,name,email,class,students,classes complete, classes missing feedback, classes missed, meeting link, class times\n${csv}`

  const blob = new Blob([csvWithHeaders], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  function handleCheckAll(
    e: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    const target = e.target as HTMLInputElement
    if (target.checked) {
      checked = Array.from({ length: data.classes.length }, (_, i) => i)
    } else {
      checked = []
    }
  }
</script>

<svelte:head>
  <title>Classes</title>
</svelte:head>

<ClassDetails bind:dialogEl id={selectedClassId} />

<div class="flex flex-wrap items-center gap-4">
  <SearchBox basePath="/classes" />
  <CourseFilter />
  <PerPageControl />
  <Button color="blue" class="h-12 flex items-center"
    ><a href={url}>Download</a></Button
  >
  <Button
    on:click={() =>
      copyEmails(
        data.classes.map((instructor) => `${instructor.email}`).join(', '),
      )}
    class="h-12 flex items-center gap-1"
  >
    <svg
      fill="#000000"
      height="20"
      width="20"
      version="1.1"
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 352.804 352.804"
      xml:space="preserve"
    >
      <g>
        <path
          d="M318.54,57.282h-47.652V15c0-8.284-6.716-15-15-15H34.264c-8.284,0-15,6.716-15,15v265.522c0,8.284,6.716,15,15,15h47.651
 v42.281c0,8.284,6.716,15,15,15H318.54c8.284,0,15-6.716,15-15V72.282C333.54,63.998,326.824,57.282,318.54,57.282z
  M49.264,265.522V30h191.623v27.282H96.916c-8.284,0-15,6.716-15,15v193.24H49.264z M303.54,322.804H111.916V87.282H303.54V322.804
 z"
        />
      </g>
    </svg>
    <span>Copy Emails</span>
  </Button>
</div>

{#await data then feedback}
  <Table>
    <svelte:fragment slot="head">
      <th scope="col" class="px-6 py-3">Instructor Name</th>
      <th scope="col" class="px-6 py-3">Instructor Email</th>
      <th scope="col" class="px-6 py-3">Course</th>
      <th scope="col" class="px-6 py-3">Meeting Link</th>
      <th scope="col" class="px-6 py-3">Class Time</th>
      <th scope="col" class="px-6 py-3">Number of students</th>
      <th scope="col" class="px-6 py-3">Classes Missed</th>
      <th scope="col" class="px-6 py-3">Classes Missing Feedback</th>
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#each feedback.classes as value, i}
        <tr
          class="bg-white border-b hover:bg-gray-50 hover:cursor-pointer"
          on:click={() => {
            selectedClassId = value.id
            dialogEl.open()
          }}
        >
          <td class="px-6 py-4">
            {value.name}
          </td>
          <td class="px-6 py-4">
            {value.email}
          </td>
          <td class="px-6 py-4">
            {value.courses}
          </td>
          <td class="px-6 py-4">
            {value.meetingLink}
          </td>
          <td class="px-6 py-4">
            {value.classTimes.join(', ')}
          </td>
          <td class="px-6 py-4">
            {value.students ? value.students.length : 0}
          </td>
          <td class="px-6 py-4">
            {value.classStatuses.filter(
              (status) => status === ClassStatus.ClassNotHeld,
            ).length}
          </td>
          <td class="px-6 py-4">
            {value.classStatuses.filter(
              (status) => status === ClassStatus.FeedbackIncomplete,
            ).length}
          </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
  {#if !data.query && feedback.classes}
    <div class="flex justify-end gap-2 mt-4">
      {#if currentPage > 1}
        <Button href={prevHref}>Previous</Button>
      {/if}
      {#if feedback.classes.length >= currentLimit}
        <Button href={nextHref}>Next</Button>
      {/if}
    </div>
  {/if}
{/await}
