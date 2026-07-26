<script lang="ts">
  import { run } from 'svelte/legacy'

  import { invalidate } from '$app/navigation'
  import { page } from '$app/stores'
  import { db } from '$lib/client/firebase'
  import Application from '$lib/components/Application.svelte'
  import Button from '$lib/components/Button.svelte'
  import CollectionFilter from '$lib/components/CollectionFilter.svelte'
  import type Dialog from '$lib/components/Dialog.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import SearchBox from '$lib/components/SearchBox.svelte'
  import StatusFilter from '$lib/components/StatusFilter.svelte'
  import Table from '$lib/components/Table.svelte'
  import {
    resolveSemester,
    semesterCollectionPath,
    withSemester,
  } from '$lib/data/collections'
  import { actions, alert } from '$lib/stores'
  import { generateCSV } from '$lib/utils'
  import { format } from 'date-fns'
  import { doc, setDoc, updateDoc } from 'firebase/firestore'
  import type { PageData } from './$types'

  interface Props {
    data: PageData
  }

  let { data }: Props = $props()
  let dialogEl: Dialog | undefined = $state()
  let current: number | undefined = $state()
  let checked: Array<number> = $state([])

  const csvHeaders = [
    'ID',
    'Submitted',
    'Decision',
    'Likely Decision',
    'Notes',
    'First Name',
    'Last Name',
    'Email',
    'School',
    'Graduation Year',
    'Courses',
    'Time Slots',
    'Taught Before',
    'In-person',
  ]

  function createDecisionAction(decision: Data.Decision) {
    let name: 'Accept' | 'Waitlist' | 'Reject' | 'Interview' | 'Substitute'
    let color: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
    switch (decision) {
      case 'accepted': {
        name = 'Accept'
        color = 'green'
        break
      }
      case 'waitlisted': {
        name = 'Waitlist'
        color = 'yellow'
        break
      }
      case 'rejected': {
        name = 'Reject'
        color = 'red'
        break
      }
      case 'interview': {
        name = 'Interview'
        color = 'blue'
        break
      }
      case 'substitute': {
        name = 'Substitute'
        color = 'purple'
        break
      }
    }

    return {
      name: `${name} ${checked.length} ${
        checked.length > 1 ? 'applicants' : 'applicant'
      }`,
      color,
      callback: async () => {
        try {
          await Promise.all(
            checked.map(async (i) => {
              const id = data.applications[i].id
              const decisionDocRef = doc(
                db,
                semesterCollectionPath(selectedSemester, 'decisions'),
                id,
              )
              await setDoc(
                decisionDocRef,
                withSemester({ type: decision }, selectedSemester),
              )
              await updateDoc(doc(db, selectedCollection, id), {
                'meta.decision': decisionDocRef,
              })
            }),
          )
          await invalidate('app:applications')
          alert.trigger(
            'success',
            `${checked.length} ${
              checked.length > 1 ? 'applicants' : 'applicant'
            } ${decision}.`,
          )
          checked = []
        } catch (err: any) {
          console.error('Failed to update decisions:', err)
          alert.trigger(
            'error',
            `Failed to update decision: ${err.message || err}`,
          )
          throw err
        }
      },
    }
  }
  function handleCheck(
    e: Event & { currentTarget: EventTarget & HTMLInputElement },
    i: number,
  ) {
    const target = e.target as HTMLInputElement
    if (target.checked) {
      checked = [...checked, i]
    } else {
      checked = checked.filter((item) => item !== i)
    }
  }
  function handleCheckAll(
    e: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    const target = e.target as HTMLInputElement
    if (target.checked) {
      checked = Array.from({ length: data.applications.length }, (_, i) => i)
    } else {
      checked = []
    }
  }

  let rows = $derived(
    data.applications.map((application: PageData['applications'][number]) => {
      const {
        id,
        values: {
          personal: { firstName, lastName, email },
          academic: { school, graduationYear },
          program: { courses, timeSlots, inPerson },
          essay: { taughtBefore },
          meta: { submitted, decision },
        },
      } = application

      return [
        id,
        submitted ? 'Submitted' : 'Not Submitted',
        decision?.type ?? 'Undecided',
        decision?.likelyDecision ?? 'Undecided',
        decision?.notes ?? '',
        firstName,
        lastName,
        email,
        school,
        graduationYear,
        courses.join(';'),
        timeSlots,
        taughtBefore ? 'Yes' : 'No',
        inPerson ? 'Yes' : 'No',
      ]
    }),
  )
  let csvWithHeaders = $derived(generateCSV(csvHeaders, rows))
  let blob = $derived(new Blob([csvWithHeaders], { type: 'text/csv' }))
  let url = $derived(URL.createObjectURL(blob))
  run(() => {
    if ($actions === null) {
      checked = []
    }
  })
  run(() => {
    if (checked.length > 0) {
      actions.set([
        createDecisionAction('accepted'),
        createDecisionAction('waitlisted'),
        createDecisionAction('rejected'),
        createDecisionAction('interview'),
        createDecisionAction('substitute'),
      ])
    } else {
      actions.set(null)
    }
  })
  let application = $derived(
    data.applications.length === 0
      ? undefined
      : current === undefined
        ? undefined
        : data.applications[current],
  )
  let currentPage = $derived(data.page ?? 1)
  let currentLimit = $derived(data.limit ?? 25)
  let prevHref = $derived(
    (() => {
      if (currentPage <= 1) return ''
      const base = new URLSearchParams($page.url.searchParams)
      base.set('page', String(currentPage - 1))
      return `?${base.toString()}`
    })(),
  )
  let nextHref = $derived(
    (() => {
      if (data.applications.length < currentLimit) return ''
      const base = new URLSearchParams($page.url.searchParams)
      base.set('page', String(currentPage + 1))
      return `?${base.toString()}`
    })(),
  )
  let selectedSemester = $derived(
    resolveSemester($page.url.searchParams.get('semester')),
  )
  let selectedCollection = $derived(
    semesterCollectionPath(selectedSemester, 'applications'),
  )
</script>

<svelte:head>
  <title>Applications</title>
</svelte:head>

<div class="flex flex-wrap items-end gap-4">
  <SearchBox basePath="/applications" />
  <CollectionFilter />
  <StatusFilter type="applications" />
  <PerPageControl />
  <Button class="flex h-12 items-center" href={url} download="applications.csv"
    >Download</Button
  >
</div>

<Table>
  {#snippet head()}
    <th scope="col" class="p-4">
      <div class="flex items-center">
        <input
          id="check-all"
          class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 focus:outline-hidden disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
          type="checkbox"
          checked={checked.length === data.applications.length &&
            checked.length > 0}
          oninput={handleCheckAll}
        />
        <label for="check-all" class="sr-only">checkbox</label>
      </div>
    </th>
    <th scope="col" class="px-6 py-3">Likely decision</th>
    <th scope="col" class="px-6 py-3">Notes</th>
    <th scope="col" class="px-6 py-3">Submitted</th>
    <th scope="col" class="px-6 py-3">Decision</th>
    <th scope="col" class="px-6 py-3">Interview scheduled</th>
    <th scope="col" class="px-6 py-3">Name</th>
    <th scope="col" class="px-6 py-3">Email</th>
    <th scope="col" class="px-6 py-3">School</th>
    <th scope="col" class="px-6 py-3">Year</th>
    <th scope="col" class="px-6 py-3">Courses</th>
    <th scope="col" class="px-6 py-3">Timeslots</th>
    <th scope="col" class="px-6 py-3">Taught before</th>
  {/snippet}
  {#snippet body()}
    {#each data.applications as application, i (application.id)}
      <tr
        class="border-b bg-white hover:cursor-pointer hover:bg-gray-50"
        onclick={() => {
          current = i
          dialogEl?.open()
        }}
      >
        <td class="w-4 p-4">
          <div class="flex items-center">
            <input
              id={`check-${i}`}
              class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 focus:outline-hidden disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
              type="checkbox"
              checked={checked.includes(i)}
              oninput={(e) => handleCheck(e, i)}
              onclick={(e) => e.stopPropagation()}
            />
            <label for="check-all" class="sr-only">checkbox</label>
          </div>
        </td>
        <td class="px-6 py-4">
          {#if application.values.meta.decision?.likelyDecision}
            {#if application.values.meta.decision?.likelyDecision === 'likely yes'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5 text-green-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd"
                />
              </svg>
            {:else if application.values.meta.decision?.likelyDecision === 'likely no'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5 text-red-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
            {:else if application.values.meta.decision?.likelyDecision === 'likely waitlist'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5 text-yellow-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          {:else}
            None
          {/if}
        </td>
        <td class="px-6 py-4">
          {`${application.values.meta.decision?.notes}`}
        </td>
        <td class="px-6 py-4">
          {#if application.values.meta.submitted}
            {format(application.values.timestamps.updated, 'yyyy.MM.dd p')}
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          {/if}
        </td>
        <td class="px-6 py-4">
          {#if application.values.meta.decision?.type}
            {#if application.values.meta.decision?.type === 'accepted'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5 text-green-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd"
                />
              </svg>
            {:else if application.values.meta.decision?.type === 'waitlisted'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5 text-yellow-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd"
                />
              </svg>
            {:else if application.values.meta.decision.type === 'rejected'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5 text-red-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
            {:else if application.values.meta.decision.type === 'interview'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5 text-blue-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clip-rule="evenodd"
                />
              </svg>
            {:else if application.values.meta.decision.type === 'substitute'}
              <svg
                class="h-5 w-5 text-purple-300"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fill-rule="evenodd"
                  d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4.243a1 1 0 1 0-2 0V11H7.757a1 1 0 1 0 0 2H11v3.243a1 1 0 1 0 2 0V13h3.243a1 1 0 1 0 0-2H13V7.757Z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          {:else}
            None
          {/if}
        </td>
        <td class="px-6 py-4">
          {`${application.values.meta.interview ? 'Yes' : 'No'}`}
        </td>
        <td class="px-6 py-4">
          {`${application.values.personal.firstName} ${application.values.personal.lastName}`}
        </td>
        <td class="px-6 py-4"> {application.values.personal.email} </td>
        <td class="px-6 py-4">
          {application.values.academic.school}
        </td>
        <td class="px-6 py-4">
          {application.values.academic.graduationYear}
        </td>
        <td class="px-6 py-4">{application.values.program.courses}</td>
        <td class="px-6 py-4">{application.values.program.timeSlots}</td>

        <td class="px-6 py-4">
          {#if application.values.essay.taughtBefore}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          {/if}
        </td>
      </tr>
    {/each}
  {/snippet}
</Table>

{#if !data.query && data.applications}
  <div class="mt-4 flex justify-end gap-2">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.applications.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}

<Application
  bind:dialogEl
  id={application?.id}
  collection={selectedCollection}
/>

<style>
  input:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
  }
</style>
