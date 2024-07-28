<script lang="ts">
  import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore'
  import { db, user } from '$lib/client/firebase'
  import { onMount } from 'svelte'
  import Table from '$lib/components/Table.svelte'
  import Dialog from '$lib/components/Dialog.svelte'
  import {copyEmails, formatTime24to12 } from '$lib/utils'
  import { format } from 'date-fns'
  import ClassDetails from '$lib/components/ClassDetails.svelte'
  import type { PageData } from './$types'
    import Select from '$lib/components/Select.svelte'
    import Button from '$lib/components/Button.svelte'
    import Form from '$lib/components/Form.svelte'
    import Input from '$lib/components/Input.svelte'
    import { goto } from '$app/navigation'
    import { page } from '$app/stores'
    import {alert} from '$lib/stores'
    import { ClassStatus } from '$lib/data/types/ClassStatus'

  export let data: PageData
  let showValidation = false
  let currentUser: Data.User.Store
  let scheduled = false
  let loading = true
  let selectedClassId: string | undefined = undefined
  let search: string = data.query ?? ''
  let checked: Array<number> = []
  let courseFilter: 'Scratch' | 'Python' | 'Python II' | 'Web Development' | 'Engineering I' | 'Engineering II' | 'Engineering III' | 'Math I' | 'Math II' | 'Math III' | 'Math IV' | 'Math V' | 'Environmental Science' =
    ($page.url.searchParams.get('filter') as any) ?? 'all'
  
  let filterRef = ''
  let dialogEl: Dialog

    $: {
      const base = $page.url.searchParams
        base.set('filter', courseFilter)
        base.delete('updated')
      filterRef = `?${base.toString()}`
    }

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
          classStatuses.filter((status) => status === ClassStatus.EverythingComplete).length,
          classStatuses.filter((status) => status === ClassStatus.FeedbackIncomplete).length,
          classStatuses.filter((status) => status === ClassStatus.ClassNotHeld).length,
          meetingLink,
          classTimes.map((value) => value.toString()).join(', ')
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
    function handleSearch() {
      if (search === '') {
        goto('/registrations')
      } else {
        const base = $page.url.searchParams
        base.set('query', search)
        goto(`?${base.toString()}`)
      }
    }
    async function handleClear() {
      goto('/registrations').then(() => {
        search = ''
      })
    }
</script>

<ClassDetails bind:dialogEl id={selectedClassId} />

<Form class="flex gap-4" on:submit={handleSearch}>
  <div class="relative grow">
    <Input
      class={{
        container: 'mt-0',
        input: 'mt-0 pr-20',
      }}
      bind:value={search}
      placeholder="Search"
    />
    <div class="absolute right-2 top-0 flex h-12 items-center">
      <Button class="uppercase px-2 py-1" on:click={handleClear}>Clear</Button>
    </div>
  </div>

  <Button
    class="shrink-0 h-12 w-12 p-0 flex items-center justify-center"
    type="submit"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="w-6 h-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  </Button>

  <div class="flex">
    <Select
      bind:value={courseFilter}
      label="Filter"
      options={[{ name: 'Scratch' }, { name: 'Python I' }, {name: 'Python II'}, {name: 'Web Development'}, {name: 'Math I'}, {name: 'Math II'}, {name: 'Math III'}, {name: 'Math IV'}, {name: 'Math V'}, {name: 'Engineering I'}, {name: 'Engineering II'}, {name: 'Engineering III'}, {name: 'Environmental Science'}]}
      floating
      required
    />
    <a
      href={filterRef}
      class="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg"
    >
      Filter
    </a>
  </div>
  <Button color = 'blue'><a href={url}>Download</a></Button>
  <Button on:click={ () => copyEmails (data.classes.map((instructor) =>`${instructor.email}`,).join(', '))} class="flex items-center gap-1">
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
</Form>

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
            {value.classStatuses.filter((status) => status === ClassStatus.ClassNotHeld).length}
          </td>
          <td class="px-6 py-4">
            {value.classStatuses.filter((status) => status === ClassStatus.FeedbackIncomplete).length}
          </td>
        </tr>
      {/each}
    </svelte:fragment>
  </Table>
{/await}
