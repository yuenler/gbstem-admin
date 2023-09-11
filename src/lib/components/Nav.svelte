<script lang="ts">
  import ProfileMenu from './ProfileMenu.svelte'
  import clsx from 'clsx'
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
    ...(user.role === 'admin'
      ? [
          {
            name: 'Dashboard',
            href: '/dashboard',
          },
          { name: 'Tokens', href: '/tokens' },
        ]
      : []),
    {
      name: 'Applications',
      href: '/applications',
    },
  ]
  function updateShadow() {
    shadow = window.scrollY !== 0
  }
</script>

<svelte:window on:scroll={updateShadow} />
<nav
  class={clsx(
    'px-d fixed left-0 top-0 z-40 flex h-20 w-full items-center justify-between border-b bg-white transition-all',
    shadow && !open ? 'shadow-b border-gray-200' : 'border-white',
  )}
>
  <div class="flex items-center gap-8 w-full">
    <Brand />
    {#if user.emailVerified}
      {#if $actions === null}
        <div class="hidden items-center gap-3 sm:flex">
          {#each pages as page}
            <a
              class={clsx(
                'rounded-md px-4 py-2 transition-colors',
                pathname === page.href ? 'bg-gray-200' : 'hover:bg-gray-100',
              )}
              href={page.href}
            >
              {page.name}
            </a>
          {/each}
        </div>
      {:else}
        <div
          class="hidden sm:flex items-center justify-between w-full gap-3 overflow-x-auto"
        >
          <fieldset class="flex items-center gap-3" {disabled}>
            {#each $actions as action}
              <Button
                class="rounded py-1 px-3 whitespace-nowrap"
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
    {/if}
  </div>
  {#if $actions === null}
    <div class="flex items-center gap-1 sm:gap-3 md:gap-4">
      {#if user.emailVerified}
        <AnnouncementsBell />
      {/if}
      <ProfileMenu class="hidden sm:block" />
      <button
        class="sm:hidden hover:bg-gray-200 rounded-full h-10 w-10 flex items-center justify-center transition-colors"
        type="button"
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
  {/if}
</nav>
{#if open}
  <div
    class="p-d fixed left-0 top-20 z-50 flex h-[calc(100vh-5rem)] w-screen flex-col gap-2 bg-white sm:hidden"
    transition:fade={{
      easing: cubicInOut,
      duration: 200,
    }}
  >
    {#if user.emailVerified}
      {#each pages as page}
        <a
          class={clsx(
            'rounded-md px-3 py-2 transition-colors',
            pathname === page.href ? 'bg-gray-200' : 'hover:bg-gray-100',
          )}
          href={page.href}
        >
          {page.name}
        </a>
      {/each}
    {/if}
    <div class={clsx(user.emailVerified && 'mt-d')}>
      <ProfileMenu />
    </div>
  </div>
{/if}

<style>
  .shadow-b {
    box-shadow: 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }
</style>
