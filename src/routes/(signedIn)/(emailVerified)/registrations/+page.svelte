<script lang="ts">
  import Registration from '$lib/components/Registration.svelte'
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
  import fi from 'date-fns/locale/fi'
  import Select from '$lib/components/Select.svelte'

  export let data: PageData
  let dialogEl: Dialog
  let search: string = data.query ?? ''
  let current: number | undefined
  let checked: Array<number> = []
  let decisionFilter: 'all' | 'decided' | 'undecided' =
    ($page.url.searchParams.get('filter') as any) ?? 'all'

  const mathCourseMap = {
    'Mathematics 5a': 'mathematics-v',
    'Mathematics 4a': 'mathematics-iv',
    'Mathematics 3a': 'mathematics-iii',
    'Mathematics 2a': 'mathematics-ii',
    'Mathematics 1a': 'mathematics-i',
  }

  const csv = data.registrations
    .map((registration) => {
      const {
        id,
        values: {
          personal: {
            studentFirstName,
            studentLastName,
            email,
            secondaryEmail,
          },
          academic: { school, grade },
          program: {
            csCourse,
            engineeringCourse,
            mathCourse,
            scienceCourse,
            timeSlots,
            inPerson,
          },
        },
      } = registration
      return [
        id,
        studentFirstName,
        studentLastName,
        email,
        secondaryEmail,
        school.replace(/,/g, ''),
        grade,
        csCourse.toLowerCase().replace(/ /g, '-'),
        engineeringCourse.toLowerCase().replace(/ /g, '-'),
        mathCourseMap[mathCourse] ? mathCourseMap[mathCourse] : mathCourse,
        scienceCourse.toLowerCase().replace(/ /g, '-'),
        timeSlots.join(';'),
        inPerson ? 'Yes' : 'No',
      ].join(',')
    })
    .join('\n')
  // add column names
  const csvWithHeaders = `id,firstName,lastName,email,secondaryEmail,school,grade,csCourse,engineeringCourse,mathCourse,scienceCourse,timeSlots,In-person\n${csv}`

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
  $: registration =
    data.registrations.length === 0
      ? undefined
      : current === undefined
      ? undefined
      : data.registrations[current]
  let nextHref = ''
  let filterRef = ''
  $: {
    const base = $page.url.searchParams
    base.set(
      'updated',
      data.registrations[
        data.registrations.length - 1
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
    let name: 'Accept' | 'Waitlist' | 'Reject'
    let color: 'green' | 'yellow' | 'red'
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
              const id = data.registrations[i].id
              return new Promise<void>((resolve, reject) => {
                setDoc(doc(db, 'decisions', id), {
                  type: decision,
                })
                  .then(() => {
                    updateDoc(doc(db, 'registrations', id), {
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
              invalidate('app:registrations').then(() => {
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
      checked = Array.from({ length: data.registrations.length }, (_, i) => i)
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

<svelte:head>
  <title>registrations</title>
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
      class="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg"
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
          checked={checked.length === data.registrations.length &&
            checked.length > 0}
          on:input={handleCheckAll}
        />
        <label for="check-all" class="sr-only">checkbox</label>
      </div>
    </th>
    <th scope="col" class="px-6 py-3">Submitted</th>
    <th scope="col" class="px-6 py-3">Name</th>
    <th scope="col" class="px-6 py-3">Email</th>
    <th scope="col" class="px-6 py-3">School</th>
    <th scope="col" class="px-6 py-3">Grade</th>
    <th scope="col" class="px-6 py-3">CS course</th>
    <th scope="col" class="px-6 py-3">engineering course</th>
    <th scope="col" class="px-6 py-3">math course</th>
    <th scope="col" class="px-6 py-3">science course</th>
    <th scope="col" class="px-6 py-3">Timeslots</th>
    <!-- <th scope="col" class="px-6 py-3">Taught before</th> -->
  </svelte:fragment>
  <svelte:fragment slot="body">
    {#each data.registrations as registration, i}
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
          {#if registration.values.meta.submitted}
            {format(registration.values.timestamps.updated, 'yyyy.MM.dd p')}
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
          {`${registration.values.personal.studentFirstName} ${registration.values.personal.studentLastName}`}
        </td>
        <td class="px-6 py-4"> {registration.values.personal.email} </td>
        <td class="px-6 py-4">
          {registration.values.academic.school}
        </td>
        <td class="px-6 py-4">
          {registration.values.academic.grade}
        </td>
        <td class="px-6 py-4">{registration.values.program.csCourse}</td>
        <td class="px-6 py-4"
          >{registration.values.program.engineeringCourse}</td
        >
        <td class="px-6 py-4">{registration.values.program.mathCourse}</td>
        <td class="px-6 py-4">{registration.values.program.scienceCourse}</td>
        <td class="px-6 py-4">{registration.values.program.timeSlots}</td>

        <td class="px-6 py-4">
          <!-- {#if registration.values.essay.taughtBefore}
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
          {/if} -->
        </td>
      </tr>
    {/each}
  </svelte:fragment>
</Table>

<div class="flex justify-end mt-4">
  <Button href={nextHref}>Next</Button>
</div>

<Registration bind:dialogEl id={registration?.id} />

<style>
  input:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
  }
</style>