<script lang="ts">
  import ProfileMenu from './ProfileMenu.svelte'
  import { cn } from '$lib/utils'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import Brand from './Brand.svelte'
  import { navigating } from '$app/stores'
  import { fade } from 'svelte/transition'
  import AnnouncementsBell from './AnnouncementsBell.svelte'
  import { cubicInOut } from 'svelte/easing'
  import { actions } from '$lib/stores'
  import Button from './Button.svelte'
  import progress from '$lib/client/progress'

  export let user: Data.User.Peek

  let shadow = false
  let open = false
  let disabled = false
  onMount(() => {
    updateShadow()
    return navigating.subscribe((navigating) => {
      if (navigating) {
        open = false
      }
    })
  })
  $: pathname = $page.url.pathname
  const pages = [
    ...(user.role === 'admin' ? [{ name: 'Tokens', href: '/tokens' }] : []),
    {
      name: 'Dashboard',
      href: '/dashboard',
    },
    {
      name: 'Classes',
      href: '/classes',
    },
    {
      name: 'Students',
      href: '/students',
    },
    {
      name: 'Interviews',
      href: '/interviews',
    },
    {
      name: 'Applications',
      href: '/applications',
    },
    {
      name: 'Registrations',
      href: '/registrations',
    },
    ...(user.role === 'admin'
      ? [
          {
            name: 'Student Feedback',
            href: '/student-feedback',
          },
          {
            name: 'Instructor Feedback',
            href: '/instructor-feedback',
          },
        ]
      : []),
    {
      name: 'Sub Requests Log',
      href: '/sub-requests',
    },
  ]
  function updateShadow() {
    shadow = window.scrollY !== 0
  }
</script>

<svelte:window on:scroll={updateShadow} />
<nav
  class={cn(
    'px-4 md:px-6 lg:px-8 fixed left-0 top-0 z-40 flex h-20 w-full items-center justify-between border-b bg-white transition-all gap-2 md:gap-4 lg:gap-6',
    shadow && !open ? 'shadow-b border-gray-200' : 'border-white',
  )}
>
  <!-- Left Brand logo -->
  <Brand />

  <!-- Middle Pages Links (visible on sm and larger, scales down spacing/text size) -->
  {#if user.emailVerified && $actions === null}
    <div
      class="no-scrollbar hidden min-w-0 flex-1 items-center justify-start gap-0.5 overflow-x-auto px-2 py-1 sm:flex md:gap-1 lg:justify-center lg:gap-1.5 xl:gap-2"
    >
      {#each pages as page}
        <a
          class={cn(
            'rounded-md px-1.5 py-1 text-[11px] md:px-2 md:py-1 md:text-xs lg:px-2.5 lg:py-1.5 lg:text-[13px] xl:text-[14px] transition-colors text-center leading-tight flex items-center justify-center min-h-10 max-w-25 shrink-0',
            pathname === page.href ? 'bg-gray-200' : 'hover:bg-gray-100',
          )}
          href={page.href}
        >
          {page.name}
        </a>
      {/each}
    </div>
  {/if}

  <!-- Middle Active Actions (visible on sm and larger, takes up remaining middle space) -->
  {#if user.emailVerified && $actions !== null}
    <div
      class="hidden min-w-0 flex-1 items-center justify-between gap-3 overflow-x-auto sm:flex"
    >
      <fieldset class="flex items-center gap-3" {disabled}>
        {#each $actions as action}
          <Button
            class="rounded-sm px-3 py-1 whitespace-nowrap"
            color={action.color}
            on:click={() => {
              progress.start()
              disabled = true
              action.callback().finally(() => {
                progress.done()
                disabled = false
              })
            }}
          >
            {action.name}
          </Button>
        {/each}
      </fieldset>
      <Button on:click={() => ($actions = null)}>Close</Button>
    </div>
  {/if}

  <!-- Right Profile and Mobile Menu button -->
  <div class="flex shrink-0 items-center gap-1 sm:gap-3 md:gap-4">
    {#if $actions === null}
      <ProfileMenu class="hidden sm:block" />
    {/if}
    <button
      class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-200 sm:hidden"
      type="button"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      on:click={() => {
        open = !open
      }}
    >
      {#if open}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-8 w-8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-8 w-8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 9h16.5m-16.5 6.75h16.5"
          />
        </svg>
      {/if}
    </button>
  </div>
</nav>
{#if open}
  <div
    class="fixed top-20 left-0 z-50 flex h-[calc(100vh-5rem)] w-screen flex-col gap-2 bg-white p-d sm:hidden"
    transition:fade={{
      easing: cubicInOut,
      duration: 200,
    }}
  >
    {#if user.emailVerified}
      {#each pages as page}
        <a
          class={cn(
            'rounded-md px-3 py-2 transition-colors',
            pathname === page.href ? 'bg-gray-200' : 'hover:bg-gray-100',
          )}
          href={page.href}
        >
          {page.name}
        </a>
      {/each}
    {/if}
    <div class={cn(user.emailVerified && 'mt-d')}>
      <ProfileMenu />
    </div>
  </div>
{/if}

<style>
  .shadow-b {
    box-shadow: 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
