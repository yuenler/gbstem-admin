<script lang="ts">
  import { db, user, type ApplicationData } from '$lib/client/firebase'
  import Card from '$lib/components/Card.svelte'
  import Link from '$lib/components/Link.svelte'
  import PageLayout from '$lib/components/PageLayout.svelte'
  import { getDoc, doc } from 'firebase/firestore'
  import { fade } from 'svelte/transition'

  type ApplicationStatus =
    | 'accepted'
    | 'waitlisted'
    | 'rejected'
    | 'submitted'
    | null
  type DashboardData = {
    application: {
      status: ApplicationStatus
    }
  }

  let loading = true
  let data: DashboardData = {
    application: {
      status: null,
    },
  }
  user.subscribe((user) => {
    if (user) {
      let timer: number
      Promise.all([
        new Promise<void>((resolve) => {
          timer = window.setTimeout(resolve, 400)
        }),
        new Promise<void>((resolve) => {
          getDoc(doc(db, 'applications', user.object.uid)).then(
            (applicationDoc) => {
              const applicationExists = applicationDoc.exists()
              if (applicationExists) {
                const applicationData = applicationDoc.data() as ApplicationData
                if (applicationData.meta.decision !== null) {
                  data.application.status = applicationData.meta.decision
                } else if (applicationData.meta.submitted) {
                  data.application.status = 'submitted'
                } else {
                  data.application.status = null
                }
              }
              resolve()
            },
          )
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
          <h2 class="text-xl font-bold">Application</h2>
          {#if data.application.status === null}
            <div class="space-y-1">
              <p>
                Early applications are due on <span class="font-bold">
                  September 4th, 2023
                </span>
                at 11:59 PM ET. Regular applications are due on
                <span class="font-bold">September 25th, 2023</span> at 11:59 PM ET.
              </p>
            </div>
          {/if}
          <div class="space-y-1">
            <p>
              {#if data.application.status === 'accepted'}
                You have been accepted to HackHarvard 2023! We look forward to
                seeing you.
              {:else if data.application.status === 'waitlisted'}
                You have been waitlisted. We will follow up with more
                information!
              {:else if data.application.status === 'rejected'}
                Unfortunately, we have decided not to accept you for this year's
                hackathon.
              {:else if data.application.status === 'submitted'}
                Your application is submitted and in review!
              {:else}
                Your application is in progress. Make sure to submit by the
                deadline!
              {/if}
            </p>
            <Link href="/apply">View application</Link>
          </div>
        </Card>
      </div>
    {/if}
  </div>
</PageLayout>
