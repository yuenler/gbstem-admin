<script lang="ts">
  import { db, user } from '$lib/client/firebase'
  import Button from '$lib/components/Button.svelte'
  import Card from '$lib/components/Card.svelte'
  import {
    applicationsCollection,
    classesCollection,
    registrationsCollection,
  } from '$lib/data/collections'
  import sendClassReminder from '$lib/data/helpers/sendClassReminders'
  import { ClassStatus } from '$lib/data/types/ClassStatus'
  import { alert } from '$lib/stores'
  import { formatDate, timestampToDate, writeToClipboard } from '$lib/utils'
  import {
    collection,
    getCountFromServer,
    getDocs,
    query,
    Timestamp,
    where,
  } from 'firebase/firestore'
  import { fade } from 'svelte/transition'
  import { onDestroy } from 'svelte'

  type DashboardData = {
    applications: {
      total: number
      submitted: number
      decided: number
      registered: number
      totalRegistrationsStarted: number
      enrolled: number
    }
    users: {
      total: number
    }
  }

  type ClassToday = {
    classNumber: number
    class: Data.Class
  }

  let classesToday: ClassToday[] = []

  let loading = true
  let uncompletedRegistrationsEmails = ''
  let uncompletedApplicationsEmails = ''

  let data: DashboardData = {
    applications: {
      total: 0,
      submitted: 0,
      decided: 0,
      registered: 0,
      totalRegistrationsStarted: 0,
      enrolled: 0,
    },
    users: {
      total: 0,
    },
  }

  let timer: any
  let queryTimeout: any

  onDestroy(() => {
    if (timer) window.clearTimeout(timer)
    if (queryTimeout) window.clearTimeout(queryTimeout)
  })

  function getClassStatusBg(status: string) {
    switch (status) {
      case ClassStatus.ClassUpcomingSoon:
        return 'bg-blue-100'
      case ClassStatus.ClassNotHeld:
        return 'bg-red-100'
      case ClassStatus.FeedbackIncomplete:
        return 'bg-yellow-100'
      case ClassStatus.EverythingComplete:
        return 'bg-green-100'
      default:
        return 'bg-gray-100'
    }
  }

  async function loadDashboardData() {
    loading = true
    try {
      const applicationsColl = collection(db, applicationsCollection)
      const usersColl = collection(db, 'users')
      const registrationsColl = collection(db, registrationsCollection)
      const classesColl = collection(db, classesCollection)

      const timerPromise = new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, 400)
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        queryTimeout = window.setTimeout(() => {
          reject(new Error('Query timeout (10 seconds)'))
        }, 10000)
      })

      const fetchPromise = Promise.all([
        getDocs(query(registrationsColl, where('meta.submitted', '==', false))),
        getDocs(query(applicationsColl, where('meta.submitted', '==', false))),
        Promise.all([
          getCountFromServer(applicationsColl),
          getCountFromServer(
            query(applicationsColl, where('meta.submitted', '==', true)),
          ),
          getCountFromServer(
            query(applicationsColl, where('meta.decision', '!=', null)),
          ),
          getCountFromServer(usersColl),
          getCountFromServer(
            query(registrationsColl, where('meta.submitted', '==', true)),
          ),
          getCountFromServer(registrationsColl),
          getCountFromServer(
            query(registrationsColl, where('enrolled', '==', true)),
          ),
        ]),
        getDocs(query(classesColl)),
      ])

      const [
        uncompletedRegistrationsSnapshot,
        uncompletedApplicationsSnapshot,
        counts,
        classesSnapshot,
      ] = await Promise.race([fetchPromise, timeoutPromise])

      // Process uncompleted registration emails
      let regEmails = ''
      uncompletedRegistrationsSnapshot.forEach((doc) => {
        const email = doc.data().personal?.email
        if (email) {
          regEmails += email + ', '
        }
      })
      uncompletedRegistrationsEmails = regEmails

      // Process uncompleted application emails
      let appEmails = ''
      uncompletedApplicationsSnapshot.forEach((doc) => {
        const email = doc.data().personal?.email
        if (email) {
          appEmails += email + ', '
        }
      })
      uncompletedApplicationsEmails = appEmails

      // Process counts
      const [
        totalApplicationsSnapshot,
        submittedApplicationsSnapshot,
        decidedApplicationsSnapshot,
        totalUsersSnapshot,
        submittedRegistrationsSnapshot,
        totalRegistrationsSnapshot,
        enrolledRegistrationsSnapshot,
      ] = counts

      data = {
        applications: {
          total: totalApplicationsSnapshot.data().count,
          submitted: submittedApplicationsSnapshot.data().count,
          decided: decidedApplicationsSnapshot.data().count,
          registered: submittedRegistrationsSnapshot.data().count,
          totalRegistrationsStarted: totalRegistrationsSnapshot.data().count,
          enrolled: enrolledRegistrationsSnapshot.data().count,
        },
        users: {
          total: totalUsersSnapshot.data().count,
        },
      }

      // Process classes today
      const todayClasses: ClassToday[] = []
      classesSnapshot.forEach((doc) => {
        const meetingTimes: Timestamp[] = doc.data().meetingTimes
        if (meetingTimes !== undefined && Array.isArray(meetingTimes)) {
          for (let i = 0; i < meetingTimes.length; i++) {
            const rawTime = meetingTimes[i]
            if (rawTime) {
              const meetingTime = timestampToDate(rawTime)
              if (
                meetingTime &&
                new Date().toLocaleDateString() ===
                  meetingTime.toLocaleDateString()
              ) {
                const classSession = doc.data() as Data.Class
                todayClasses.push({ class: classSession, classNumber: i })
              }
            }
          }
        }
      })
      classesToday = todayClasses

      // Wait for minimum loader time
      await timerPromise
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      alert.trigger(
        'error',
        `Failed to load dashboard data: ${err.message || err}`,
      )
    } finally {
      if (timer) window.clearTimeout(timer)
      if (queryTimeout) window.clearTimeout(queryTimeout)
      loading = false
    }
  }

  user.subscribe((u) => {
    if (u) {
      loadDashboardData()
    }
  })
</script>

<svelte:head>
  <title>Dashboard</title>
</svelte:head>
<h1 class="mb-4 text-5xl font-bold md:text-6xl">Dashboard</h1>

<div class="mb-8">
  <a
    href="/announcements"
    class="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="2"
      stroke="currentColor"
      class="w-5 h-5"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
    View Announcements
  </a>
</div>

<div class="relative w-full">
  {#if loading}
    <div
      class="absolute top-0 left-0 right-0 h-[calc(100vh-216px-80px)] md:h-[calc(100vh-216px)] bg-gray-200 flex items-center justify-center rounded-lg opacity-60"
      transition:fade
    >
      <div role="status">
        <svg
          aria-hidden="true"
          class="inline w-10 h-10 text-white animate-spin fill-gray-700"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  {:else}
    <div
      class="space-y-6"
      transition:fade={{
        duration: 500,
      }}
    >
      <Card class="space-y-2">
        <h2 class="text-xl font-bold">Applications</h2>
        <ol class="space-y-1">
          <li>
            {data.applications.total} total instructor applications created.
          </li>
          <li>{data.applications.submitted} instructor apps submitted.</li>
          <li>{data.applications.decided} instructor apps decided.</li>
          <li>{data.applications.registered} students pre-registered.</li>
          <li>
            {data.applications.totalRegistrationsStarted} pre-registrations started.
          </li>
          <li>{data.applications.enrolled} students enrolled.</li>
        </ol>
        <Button
          on:click={() => {
            writeToClipboard(uncompletedRegistrationsEmails)
              .then(() => {
                alert.trigger(
                  'success',
                  'Emails of uncompleted registrations copied to clipboard.',
                )
              })
              .catch(() => {
                alert.trigger(
                  'error',
                  'Failed to copy emails of uncompleted registrations.',
                )
              })
          }}>Copy Emails for Uncompleted Registrations</Button
        >
        <Button
          on:click={() => {
            writeToClipboard(uncompletedApplicationsEmails)
              .then(() => {
                alert.trigger(
                  'success',
                  'Emails of uncompleted applications copied to clipboard.',
                )
              })
              .catch(() => {
                alert.trigger(
                  'error',
                  'Failed to copy emails of uncompleted applications.',
                )
              })
          }}>Copy Emails for Uncompleted Applications</Button
        >
      </Card>
      <Card class="space-y-2">
        <h2 class="text-xl font-bold">Users</h2>
        <ol class="space-y-1">
          <li>{data.users.total} total.</li>
        </ol>
      </Card>
      <Card class="space-y-2">
        <h2 class="text-xl font-bold">Classes Today</h2>
        {#if classesToday.length === 0}
          <p class="text-gray-500 text-sm italic p-2">
            No classes scheduled for today.
          </p>
        {:else}
          <div
            class="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gray-500 border-b border-gray-200"
          >
            <span class="col-span-3">Course</span>
            <span class="col-span-3">Instructor</span>
            <span class="col-span-4">Action</span>
            <span class="col-span-2 text-right">Time</span>
          </div>
          <ul class="list-none space-y-2">
            {#each classesToday as classToday}
              {@const status =
                classToday.class.classStatuses[classToday.classNumber]}
              <li
                class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center rounded-lg p-4 {getClassStatusBg(
                  status,
                )}"
              >
                <p class="font-semibold sm:font-normal sm:col-span-3">
                  {classToday.class.course}
                </p>
                <p class="sm:col-span-3">
                  {classToday.class.instructorFirstName +
                    ' ' +
                    classToday.class.instructorLastName}
                </p>
                <div class="sm:col-span-4">
                  <Button
                    color="gray"
                    on:click={() =>
                      sendClassReminder({
                        instructorName: classToday.class.instructorFirstName,
                        instructorEmail: classToday.class.instructorEmail,
                        otherInstructorEmails:
                          classToday.class.otherInstructorEmails,
                        className: classToday.class.course,
                        nextMeetingTime: formatDate(
                          timestampToDate(
                            classToday.class.meetingTimes[
                              classToday.classNumber
                            ],
                          ),
                        ),
                      })}
                  >
                    Send Instructor Reminder
                  </Button>
                </div>
                <p class="sm:col-span-2 sm:text-right">
                  {formatDate(
                    timestampToDate(
                      classToday.class.meetingTimes[classToday.classNumber],
                    ),
                  )}
                </p>
              </li>
            {/each}
          </ul>
        {/if}
      </Card>
    </div>
  {/if}
</div>
