<script lang="ts">
  import { db, user } from '$lib/client/firebase'
  import Button from '$lib/components/Button.svelte'
  import Card from '$lib/components/Card.svelte'
  import PageLayout from '$lib/components/PageLayout.svelte'
  import {
    collection,
    getCountFromServer,
    query,
    where,
    getDocs,
    Timestamp,
  } from 'firebase/firestore'
  import { fade } from 'svelte/transition'
  import { alert } from '$lib/stores'
  import { classHeldToday, isClassUpcoming, formatDate, normalizeCapitals, timestampToDate, getNearestFutureClass, getNearestFutureClassIndex } from '$lib/utils'
    import { applicationsCollection, classesCollection, registrationsCollection } from '$lib/data/collections'
    import sendClassReminder from '$lib/data/helpers/sendClassReminders'

  type DashboardData = {
    applications: {
      total: number
      submitted: number
      decided: number
      registered: number
      totalRegistrationsStarted: number
    }
    users: {
      total: number
    }
  }

  type ClassToday = {
    classNumber: number
    class: Data.Class
  }

  let classesToday: ClassToday[] = [];

  let loading = true
  let uncompletedRegistrationsEmails = ''
  let uncompletedApplicationsEmails = ''

  let data: DashboardData

  user.subscribe((user) => {
    if (user) {
      let timer: number
      Promise.all([
        new Promise<void>((resolve) => {
          timer = window.setTimeout(resolve, 400)
        }),
        new Promise<void>((resolve) => {
          const applicationsColl = collection(db, applicationsCollection)
          const usersColl = collection(db, 'users')
          const registrationsColl = collection(db, registrationsCollection)
          // get uncompleted registration emails
          const submittedEmails: string[] = []
          getDocs(
            query(registrationsColl, where('meta.submitted', '==', true)),
          ).then((snapshot) => {
            snapshot.forEach((doc) => {
              submittedEmails.push(doc.data().personal.email)
            })
            resolve()
          })

          getDocs(
            query(registrationsColl, where('meta.submitted', '==', false)),
          ).then((snapshot) => {
            snapshot.forEach((doc) => {
              if(!submittedEmails.includes(doc.data().personal.email)) {
                uncompletedRegistrationsEmails += doc.data().personal.email + ', '
              }
            })
            resolve()
          })

          // get uncompleted application emails
          getDocs(
            query(applicationsColl, where('meta.submitted', '==', false)),
          ).then((snapshot) => {
            snapshot.forEach((doc) => {
              uncompletedApplicationsEmails += doc.data().personal.email + ', '
            })
            resolve()
          })

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
          ]).then(
            ([
              totalApplicationsSnapshot,
              submittedApplicationsSnapshot,
              decidedApplicationsSnapshot,
              totalUsersSnapshot,
              submittedRegistrationsSnapshot,
              totalRegistrationsSnapshot,
            ]) => {
              data = {
                applications: {
                  total: totalApplicationsSnapshot.data().count,
                  submitted: submittedApplicationsSnapshot.data().count,
                  decided: decidedApplicationsSnapshot.data().count,
                  registered: submittedRegistrationsSnapshot.data().count,
                  totalRegistrationsStarted:
                    totalRegistrationsSnapshot.data().count,
                },
                users: {
                  total: totalUsersSnapshot.data().count,
                },
              }
              resolve()
            },
          )
        }),

        new Promise<void>((resolve) => {
          const q = query(collection(db, classesCollection))
          getDocs(q).then((snapshot) => {
          snapshot.forEach((doc) => {
          const meetingTimes: Timestamp[] = doc.data().meetingTimes;
          if(meetingTimes === undefined) return;
          for (let i = 0; i < Object.values(meetingTimes).length; i++){
            const meetingTime = Object.values(meetingTimes).at(i) ? timestampToDate(Object.values(meetingTimes).at(i)) : new Date();
          if (meetingTime && new Date().toLocaleDateString() === meetingTime.toLocaleDateString()) {
            const classSession = doc.data() as Data.Class;
            classesToday.push({class: classSession, classNumber: i});
            }
          }
        });
            resolve(console.log(classesToday));
          });
        }),
      ]).then(() => {
        loading = false
      })     
      return () => window.clearTimeout(timer)
    }
  })
</script>

<svelte:head>
  <title>Dashboard</title>
</svelte:head>

<PageLayout cols={2}>
  <svelte:fragment slot="title">Dashboard</svelte:fragment>
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
          </ol>
          <Button
            on:click={() => {
              // copy emails to clipboard
              navigator.clipboard.writeText(uncompletedRegistrationsEmails)
              alert.trigger(
                'success',
                'Emails of uncompleted registrations copied to clipboard.',
              )
            }}>Copy Emails for Uncompleted Registrations</Button
          >
          <Button
            on:click={() => {
              // copy emails to clipboard
              navigator.clipboard.writeText(uncompletedApplicationsEmails)
              alert.trigger(
                'success',
                'Emails of uncompleted applications copied to clipboard.',
              )
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
            <ul class="list-none space-y-2">
              {#each classesToday as classToday}
                {#if isClassUpcoming(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))}
                  <li
                      class="flex items-center justify-between rounded-lg p-4 bg-blue-100"
                    >
                    <p>{classToday.class.course}</p>
                    <p>{classToday.class.instructorFirstName + " " + classToday.class.instructorLastName}</p>
                    <Button color = 'gray' on:click = {() => sendClassReminder({ instructorName: classToday.class.instructorFirstName, instructorEmail: classToday.class.instructorEmail, otherInstructorEmails: classToday.class.otherInstructorEmails, className: classToday.class.course, nextMeetingTime: formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))})}>Send Instructor Reminder</Button>
                    <p>{formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))}</p>
                  </li>
                {:else if !classHeldToday(classToday.class.completedClassDates, classToday.class.meetingTimes[getNearestFutureClassIndex(classToday.class.meetingTimes)])}
                    <li
                    class="flex items-center justify-between rounded-lg p-4 bg-red-100"
                  >
                  <p>{classToday.class.course}</p>
                  <p>{classToday.class.instructorFirstName + " " + classToday.class.instructorLastName}</p>
                  <Button color = 'gray' on:click = {() => sendClassReminder({ instructorName: classToday.class.instructorFirstName, instructorEmail: classToday.class.instructorEmail, otherInstructorEmails: classToday.class.otherInstructorEmails, className: classToday.class.course, nextMeetingTime: formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))})}>Send Instructor Reminder</Button>
                  <p>{formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))}</p>
                </li>
                {:else if classToday.class.feedbackCompleted[classToday.classNumber] === false}
                    <li
                    class="flex items-center justify-between rounded-lg p-4 bg-yellow-100" 
                  >
                  <p>{classToday.class.course}</p>
                  <p>{classToday.class.instructorFirstName + " " + classToday.class.instructorLastName}</p>
                  <Button color = 'gray' on:click = {() => sendClassReminder({ instructorName: classToday.class.instructorFirstName, instructorEmail: classToday.class.instructorEmail, otherInstructorEmails: classToday.class.otherInstructorEmails, className: classToday.class.course, nextMeetingTime: formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))})}>Send Instructor Reminder</Button>
                  <p>{formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))}</p>
                </li>
                {:else}
                    <li
                    class="flex items-center justify-between rounded-lg p-4 bg-green-100"
                  >
                  <p>{classToday.class.course}</p>
                  <p>{classToday.class.instructorFirstName + " " + classToday.class.instructorLastName}</p>
                  <Button color = 'gray' on:click = {() => sendClassReminder({ instructorName: classToday.class.instructorFirstName, instructorEmail: classToday.class.instructorEmail, otherInstructorEmails: classToday.class.otherInstructorEmails, className: classToday.class.course, nextMeetingTime: formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))})}>Send Instructor Reminder</Button>
                  <p>{formatDate(timestampToDate(classToday.class.meetingTimes[classToday.classNumber]))}</p>
                </li>
                {/if}
                {/each}
            </ul>          
          </Card>    
      </div>
    {/if}
  </div>
</PageLayout>
