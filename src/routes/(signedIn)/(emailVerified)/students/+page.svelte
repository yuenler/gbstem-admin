<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { db } from '$lib/client/firebase'
  import Button from '$lib/components/Button.svelte'
  import CourseFilter from '$lib/components/CourseFilter.svelte'
  import type Dialog from '$lib/components/Dialog.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import SearchBox from '$lib/components/SearchBox.svelte'
  import StatusFilter from '$lib/components/StatusFilter.svelte'
  import StudentDetails from '$lib/components/StudentDetails.svelte'
  import Table from '$lib/components/Table.svelte'
  import {
    classesCollection,
    registrationsCollection,
  } from '$lib/data/collections'
  import { generateCSV, normalizeCapitals } from '$lib/utils'
  import {
    collection,
    doc,
    getDocs,
    query,
    updateDoc,
    where,
  } from 'firebase/firestore'
  import { kebabCase } from 'lodash-es'
  import type { PageData } from './$types'

  export let data: PageData
  let dialogEl: Dialog
  let current: number | undefined
  let clickedRegistration: any
  let checked: Array<number> = []

  const csvHeaders = [
    'id',
    'firstName',
    'lastName',
    'email',
    'secondaryEmail',
    'school',
    'grade',
    'csCourse',
    'engineeringCourse',
    'mathCourse',
    'scienceCourse',
    'In-person',
  ]
  $: rows = data.registrations.map((registration) => {
    const {
      id,
      values: {
        personal: { studentFirstName, studentLastName, email, secondaryEmail },
        academic: { school, grade },
        program: {
          csCourse,
          engineeringCourse,
          mathCourse,
          scienceCourse,
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
      school,
      grade,
      csCourse,
      engineeringCourse,
      kebabCase(mathCourse),
      scienceCourse,
      inPerson ? 'Yes' : 'No',
    ]
  })

  $: csvWithHeaders = generateCSV(csvHeaders, rows)

  $: blob = new Blob([csvWithHeaders], { type: 'text/csv' })
  $: url = URL.createObjectURL(blob)

  $: clickedRegistration =
    data.registrations.length === 0
      ? undefined
      : current === undefined
        ? undefined
        : data.registrations[current]

  $: currentPage = data.page ?? 1
  $: currentLimit = data.limit ?? 25

  $: prevHref = (() => {
    if (currentPage <= 1) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage - 1))
    return `?${base.toString()}`
  })()

  $: nextHref = (() => {
    if (data.registrations.length < currentLimit) return ''
    const base = new URLSearchParams($page.url.searchParams)
    base.set('page', String(currentPage + 1))
    return `?${base.toString()}`
  })()

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
  function getInterestedClasses(registration: any) {
    let interestedClasses = ''
    if (registration) {
      interestedClasses += registration.values.program.csCourse.includes(
        'I am not interested',
      )
        ? ''
        : registration.values.program.csCourse + ', '
      interestedClasses +=
        registration.values.program.engineeringCourse.includes(
          'I am not interested',
        )
          ? ''
          : registration.values.program.engineeringCourse + ', '
      interestedClasses += registration.values.program.mathCourse.includes(
        'I am not interested',
      )
        ? ''
        : registration.values.program.mathCourse + ', '
      interestedClasses += registration.values.program.scienceCourse.includes(
        'I am not interested',
      )
        ? ''
        : registration.values.program.scienceCourse
    }
    return interestedClasses
  }

  async function getCourses(id: string) {
    if (!browser) return 'Loading...'
    try {
      let enrolled = true
      const q = query(
        collection(db, classesCollection),
        where('students', 'array-contains', id),
      )
      const snapshot = await getDocs(q)
      const courses = snapshot.docs.map((doc) => doc.data().course)
      if (courses.length === 0) {
        enrolled = false
      }

      const registrationDocRef = doc(db, registrationsCollection, id)
      await updateDoc(registrationDocRef, { enrolled: enrolled }).catch(
        (err) => {
          console.warn(
            `Failed to update enrolled status for registration ${id}:`,
            err,
          )
        },
      )

      return enrolled ? courses : 'NO CLASS ENROLLMENT FOUND'
    } catch (err: any) {
      console.error(`Error fetching courses for student ${id}:`, err)
      return 'ERROR LOADING ENROLLMENT'
    }
  }
</script>

<svelte:head>
  <title>Students</title>
</svelte:head>

<div class="flex flex-wrap items-end gap-4">
  <SearchBox basePath="/students" />
  <CourseFilter paramName="course" />
  <StatusFilter type="students" />
  <PerPageControl />
  <Button class="flex h-12 items-center"><a href={url}>Download</a></Button>
</div>

<Table>
  <svelte:fragment slot="head">
    <th scope="col" class="p-4">
      <div class="flex items-center">
        <input
          id="check-all"
          class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 focus:outline-hidden disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
          type="checkbox"
          checked={checked.length === data.registrations.length &&
            checked.length > 0}
          on:input={handleCheckAll}
        />
        <label for="check-all" class="sr-only">checkbox</label>
      </div>
    </th>
    <th scope="col" class="px-6 py-3">Student Name</th>
    <th scope="col" class="px-6 py-3">Classes</th>
    <th scope="col" class="px-6 py-3">Email</th>
    <th scope="col" class="px-6 py-3">School</th>
    <th scope="col" class="px-6 py-3">Grade</th>
    <th scope="col" class="px-6 py-3">Parent Name</th>
  </svelte:fragment>
  <svelte:fragment slot="body">
    {#each data.registrations as registration, i}
      <tr
        class="border-b bg-white hover:cursor-pointer hover:bg-gray-50"
        on:click={(e) => {
          e.stopPropagation()
          current = i
          dialogEl.open()
        }}
      >
        <td class="w-4 p-4">
          <div class="flex items-center">
            <input
              id={`check-${i}`}
              class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 focus:outline-hidden disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
              type="checkbox"
              checked={checked.includes(i)}
              on:input={(e) => handleCheck(e, i)}
              on:click|stopPropagation
            />
            <label for={`check-${i}`} class="sr-only">checkbox</label>
          </div>
        </td>
        <td class="px-6 py-4">
          {`${normalizeCapitals(registration.values.personal.studentFirstName + ' ' + registration.values.personal.studentLastName)}`}
        </td>

        <td class="px-6 py-4">
          {#await getCourses(registration.id)}
            Loading...
          {:then courses}
            {Array.isArray(courses)
              ? courses.join(', ')
              : courses === 'NO CLASS ENROLLMENT FOUND'
                ? 'Not Enrolled'
                : 'Error'}
          {/await}
        </td>
        <td class="px-6 py-4"> {registration.values.personal.email} </td>
        <td class="px-6 py-4">
          {registration.values.academic.school}
        </td>
        <td class="px-6 py-4">
          {registration.values.academic.grade}
        </td>
        <td class="px-6 py-4">
          {normalizeCapitals(
            registration.values.personal.parentFirstName +
              ' ' +
              registration.values.personal.parentLastName,
          )}
        </td>
      </tr>
    {/each}
  </svelte:fragment>
</Table>

<StudentDetails bind:dialogEl id={clickedRegistration?.id} />

{#if !data.query && data.registrations}
  <div class="mt-4 flex justify-end gap-2">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.registrations.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}

<style>
  input:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
  }
</style>
