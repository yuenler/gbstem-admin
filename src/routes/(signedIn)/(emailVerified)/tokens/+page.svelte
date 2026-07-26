<script lang="ts">
  import Table from '$lib/components/Table.svelte'
  import { format } from 'date-fns'
  import type { PageData } from './$types'
  import Button from '$lib/components/Button.svelte'
  import { deleteDoc, doc } from 'firebase/firestore'
  import { db } from '$lib/client/firebase'
  import { actions, alert } from '$lib/stores'
  import Token from '$lib/components/Token.svelte'
  import PerPageControl from '$lib/components/PerPageControl.svelte'
  import { goto, invalidate } from '$app/navigation'
  import { page } from '$app/stores'
  import type { FirebaseError } from 'firebase/app'
  import { writeToClipboard } from '$lib/utils'

  interface Props {
    data: PageData
  }

  let { data }: Props = $props()

  let create = $state(false)
  let disabled = {
    create: false,
  }
  let checked: Array<number> = $state([])

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
      if (data.tokens.length < currentLimit) return ''
      const base = new URLSearchParams($page.url.searchParams)
      base.set('page', String(currentPage + 1))
      return `?${base.toString()}`
    })(),
  )
  $effect(() => {
    if (checked.length > 0) {
      actions.set([
        {
          name: `Delete ${checked.length} ${
            checked.length > 1 ? 'tokens' : 'token'
          }`,
          color: 'red',
          callback: async () => {
            try {
              await Promise.all(
                checked.map((i) => {
                  const token = data.tokens[i]
                  return deleteDoc(doc(db, 'tokens', token.id))
                }),
              )
              await invalidate('app:tokens')
              checked = []
              alert.trigger('success', 'Token deleted.')
            } catch (err: any) {
              console.error('Failed to delete tokens:', err)
              throw err
            }
          },
        },
      ])
    } else {
      actions.set(null)
    }
  })
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
      checked = Array.from({ length: data.tokens.length }, (_, i) => i)
    } else {
      checked = []
    }
  }
  function handleCreate() {
    create = true
  }
  async function handleCopyAction(token: {
    id: string
    values: Data.Token<'pojo'>
  }) {
    try {
      await writeToClipboard(`${$page.url.host}/signup?token=${token.id}`)
      alert.trigger('success', 'Token copied.')
    } catch {
      alert.trigger('error', 'Failed to copy token.')
    }
  }
  async function handleDeleteAction(token: {
    id: string
    values: Data.Token<'pojo'>
  }) {
    try {
      await deleteDoc(doc(db, 'tokens', token.id))
      await invalidate('app:tokens')
      alert.trigger('success', 'Token deleted.')
    } catch (err: any) {
      alert.trigger('error', err.message)
    }
  }
</script>

<svelte:head>
  <title>Tokens</title>
</svelte:head>

<div class="mb-4 flex flex-wrap items-center gap-4">
  <PerPageControl />
</div>

<Table>
  {#snippet head()}
    <th scope="col" class="p-4">
      <div class="flex items-center">
        <input
          id="check-all"
          class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 focus:outline-hidden disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
          type="checkbox"
          checked={checked.length === data.tokens.length && checked.length > 0}
          oninput={handleCheckAll}
        />
        <label for="check-all" class="sr-only">checkbox</label>
      </div>
    </th>
    <th scope="col" class="px-6 py-3">Expires</th>
    <th scope="col" class="px-6 py-3">Token</th>
    <th scope="col" class="px-6 py-3">Role</th>
    <th scope="col" class="px-6 py-3">Consumable</th>
    <th scope="col" class="px-6 py-3">Consumers</th>
    <th scope="col" class="flex justify-end px-6 py-3">
      <Button
        class="flex h-10 w-10 items-center justify-center p-0"
        color="blue"
        onclick={handleCreate}
        disabled={disabled.create}
      >
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
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </Button>
    </th>
  {/snippet}
  {#snippet body()}
    {#each data.tokens as token, i (token.id)}
      <tr class="border-b bg-white">
        <td class="w-4 p-4">
          <div class="flex items-center">
            <input
              id={`check-${i}`}
              class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 focus:outline-hidden disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
              type="checkbox"
              checked={checked.includes(i)}
              oninput={(e) => handleCheck(e, i)}
            />
            <label for="check-all" class="sr-only">checkbox</label>
          </div>
        </td>
        <td class="px-6 py-4">
          {#if token.values.expires < new Date()}
            <span class="text-red-500">Expired</span>
          {:else}
            {format(token.values.expires, 'yyyy.MM.dd p')}
          {/if}
        </td>
        <th
          scope="row"
          class="px-6 py-4 font-medium whitespace-nowrap text-gray-900"
        >
          {token.id}
        </th>
        <td class="px-6 py-4 capitalize"> {token.values.role} </td>
        <td class="px-6 py-4 capitalize">
          {#if token.values.consumable}
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
        <td class="px-6 py-4"> {token.values.consumers.length} </td>
        <td class="space-x-2 px-6 py-4 whitespace-nowrap">
          <button
            class="text-gray-700 transition-colors duration-300 hover:text-gray-500"
            type="button"
            onclick={() => handleCopyAction(token)}
          >
            Copy
          </button>
          <button
            class="text-red-700 transition-colors duration-300 hover:text-red-500"
            type="button"
            onclick={() => handleDeleteAction(token)}
          >
            Delete
          </button>
        </td>
      </tr>
    {/each}
  {/snippet}
</Table>

{#if data.tokens}
  <div class="mt-4 flex justify-end gap-2">
    {#if currentPage > 1}
      <Button href={prevHref}>Previous</Button>
    {/if}
    {#if data.tokens.length >= currentLimit}
      <Button href={nextHref}>Next</Button>
    {/if}
  </div>
{/if}

{#if create}
  <Token
    onExit={() => {
      create = false
    }}
  />
{/if}

<style>
  input:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
  }
</style>
