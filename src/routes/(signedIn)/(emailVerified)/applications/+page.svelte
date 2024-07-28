<script lang="ts">
  import Application from '$lib/components/Application.svelte'
  import type Dialog from '$lib/components/Dialog.svelte'
  import { format } from 'date-fns'
  import Input from '$lib/components/Input.svelte'
  import Form from '$lib/components/Form.svelte'
  import Button from '$lib/components/Button.svelte'
  import type { PageData } from './$types'
  import { goto, invalidate } from '$app/navigation'
  import { page } from '$app/stores'
  import Table from '$lib/components/Table.svelte'
  import { actions, alert } from '$lib/stores'
  import { db } from '$lib/client/firebase'
  import { doc, setDoc, updateDoc } from 'firebase/firestore'
  import Select from '$lib/components/Select.svelte'
    import { applicationsCollection } from '$lib/data/collections'

  export let data: PageData
  let dialogEl: Dialog
  let search: string = data.query ?? ''
  let current: number | undefined
  let checked: Array<number> = []
  let decisionFilter: 'all' | 'decided' | 'undecided' =
    ($page.url.searchParams.get('filter') as any) ?? 'all'

  const csv = data.applications
    .map((application) => {
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
        decision?.notes.replace(/,/g, '') ?? '',
        firstName,
        lastName,
        email,
        school.replace(/,/g, ''),
        graduationYear,
        courses.join(';'),
        timeSlots.replace(/,/g, ''),
        taughtBefore ? 'Yes' : 'No',
        inPerson ? 'Yes' : 'No',
      ]
    })
    .join('\n')
  // add column names
  const csvWithHeaders = `ID,Submitted,Decision,Likely Decision,Notes,First Name,Last Name,Email,School,Graduation Year,Courses,Time Slots,Taught Before,In-person\n${csv}`

  const blob = new Blob([csvWithHeaders], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  $: if (checked.length > 0) {
    actions.set([
      createDecisionAction('accepted'),
      createDecisionAction('waitlisted'),
      createDecisionAction('rejected'),
    ])
  } else {
    actions.set(null)
  }
  $: application =
    data.applications.length === 0
      ? undefined
      : current === undefined
      ? undefined
      : data.applications[current]
  let nextHref = ''
  let filterRef = ''
  $: {
    const base = $page.url.searchParams
    base.set(
      'updated',
      data.applications[
        data.applications.length - 1
      ].values.timestamps.updated.toString(),
    )
    nextHref = `?${base.toString()}`
  }
  $: {
    const base = $page.url.searchParams
    if (decisionFilter !== 'all') {
      base.set('filter', decisionFilter)
      base.delete('updated')
    } else {
      base.delete('filter')
    }
    filterRef = `?${base.toString()}`
  }

  function createDecisionAction(decision: Data.Decision) {
    let name: 'Accept' | 'Waitlist' | 'Reject' | 'Interview'
    let color: 'green' | 'yellow' | 'red' | 'blue'
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
    }

    return {
      name: `${name} ${checked.length} ${
        checked.length > 1 ? 'applicants' : 'applicant'
      }`,
      color,
      callback: () =>
        new Promise<void>((resolve, reject) => {
          Promise.all(
            checked.map((i) => {
              const id = data.applications[i].id
              return new Promise<void>((resolve, reject) => {
                setDoc(doc(db, 'decisions', id), {
                  type: decision,
                })
                  .then(() => {
                    updateDoc(doc(db, applicationsCollection, id), {
                      'meta.decision': doc(db, 'decisions', id),
                    })
                      .then(resolve)
                      .catch(reject)
                  })
                  .catch(reject)
              })
            }),
          )
            .then(() => {
              invalidate('app:applications').then(() => {
                alert.trigger(
                  'success',
                  `${checked.length} ${
                    checked.length > 1 ? 'applicants' : 'applicant'
                  } ${decision}.`,
                )
                checked = []
                resolve()
              })
            })
            .catch(reject)
        }),
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
  function handleSearch() {
    if (search === '') {
      goto('/applications')
    } else {
      const base = $page.url.searchParams
      base.set('query', search)
      goto(`?${base.toString()}`)
    }
  }
  async function handleClear() {
    goto('/applications').then(() => {
      search = ''
    })
  }
</script>

<svelte:head>
  <title>Applications</title>
</svelte:head>

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
      bind:value={decisionFilter}
      label="Filter"
      options={[{ name: 'all' }, { name: 'undecided' }]}
      floating
      required
    />
    <a
      href={filterRef}
      class="flex items-center inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg"
    >
      Filter
    </a>
  </div>
  <Button><a href={url}>Download</a></Button>
</Form>

<Table>
  <svelte:fragment slot="head">
    <th scope="col" class="p-4">
      <div class="flex items-center">
        <input
          id="check-all"
          class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
          type="checkbox"
          checked={checked.length === data.applications.length &&
            checked.length > 0}
          on:input={handleCheckAll}
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
  </svelte:fragment>
  <svelte:fragment slot="body">
    {#each data.applications as application, i}
      <tr
        class="bg-white border-b hover:bg-gray-50 hover:cursor-pointer"
        on:click={() => {
          current = i
          dialogEl.open()
        }}
      >
        <td class="w-4 p-4">
          <div class="flex items-center">
            <input
              id={`check-${i}`}
              class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
              type="checkbox"
              checked={checked.includes(i)}
              on:input={(e) => handleCheck(e, i)}
              on:click|stopPropagation
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
                class="w-5 h-5 text-green-300"
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
                class="w-5 h-5 text-red-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
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
              class="w-5 h-5"
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
                class="w-5 h-5 text-green-300"
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
                class="w-5 h-5 text-yellow-300"
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
                class="w-5 h-5 text-red-300"
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
                class="w-5 h-5 text-blue-300"
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
              class="w-5 h-5"
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
              class="w-5 h-5"
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
  </svelte:fragment>
</Table>

<div class="flex justify-end mt-4">
  <Button href={nextHref}>Next</Button>
</div>

<Application bind:dialogEl id={application?.id} />

<style>
  input:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
  }
</style>
