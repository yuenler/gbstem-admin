<script lang="ts">
  import Table from '$lib/components/Table.svelte'
  import { format } from 'date-fns'
  import type { PageData } from './$types'
  import Button from '$lib/components/Button.svelte'
  import { deleteDoc, doc } from 'firebase/firestore'
  import { db } from '$lib/client/firebase'
  import { actions, alert } from '$lib/stores'
  import { invalidate } from '$app/navigation'
  import { page } from '$app/stores'
  import type { FirebaseError } from 'firebase/app'
  import Token from '$lib/components/Token.svelte'

  export let data: PageData

  let create = false
  let disabled = {
    create: false,
  }
  let checked: Array<number> = []
  $: if (checked.length > 0) {
    actions.set([
      {
        name: `Delete ${checked.length} ${
          checked.length > 1 ? 'tokens' : 'token'
        }`,
        color: 'red',
        callback: () =>
          new Promise<void>((resolve, reject) => {
            Promise.all(
              checked.map((i) => {
                const token = data.tokens[i]
                return deleteDoc(doc(db, 'tokens', token.id))
              }),
            )
              .then(() => {
                invalidate('app:tokens').then(() => {
                  checked = []
                  alert.trigger('success', 'Token deleted.')
                  resolve()
                })
              })
              .catch(reject)
          }),
      },
    ])
  } else {
    actions.set(null)
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
      checked = Array.from({ length: data.tokens.length }, (_, i) => i)
    } else {
      checked = []
    }
  }
  function handleCreate() {
    create = true
    console.log('hi')
  }
  function handleCopyAction(token: { id: string; values: Data.Token<'pojo'> }) {
    navigator.clipboard
      .writeText(`${$page.url.host}/signup?token=${token.id}`)
      .then(() => {
        alert.trigger('success', 'Token copied.')
      })
  }
  function handleDeleteAction(token: {
    id: string
    values: Data.Token<'pojo'>
  }) {
    deleteDoc(doc(db, 'tokens', token.id))
      .then(() => {
        invalidate('app:tokens').then(() => {
          alert.trigger('success', 'Token deleted.')
        })
      })
      .catch((err: FirebaseError) => {
        alert.trigger('error', err.message)
      })
  }
</script>

<svelte:head>
  <title>Tokens</title>
</svelte:head>

<Table>
  <svelte:fragment slot="head">
    <th scope="col" class="p-4">
      <div class="flex items-center">
        <input
          id="check-all"
          class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
          type="checkbox"
          checked={checked.length === data.tokens.length && checked.length > 0}
          on:input={handleCheckAll}
        />
        <label for="check-all" class="sr-only">checkbox</label>
      </div>
    </th>
    <th scope="col" class="px-6 py-3">Expires</th>
    <th scope="col" class="px-6 py-3">Token</th>
    <th scope="col" class="px-6 py-3">Role</th>
    <th scope="col" class="px-6 py-3">Consumable</th>
    <th scope="col" class="px-6 py-3">Consumers</th>
    <th scope="col" class="px-6 py-3 flex justify-end">
      <Button
        class="flex items-center justify-center h-10 w-10 p-0"
        color="blue"
        on:click={handleCreate}
        disabled={disabled.create}
      >
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
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </Button>
    </th>
  </svelte:fragment>
  <svelte:fragment slot="body">
    {#each data.tokens as token, i}
      <tr class="bg-white border-b">
        <td class="w-4 p-4">
          <div class="flex items-center">
            <input
              id={`check-${i}`}
              class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-400 checked:border-gray-600 checked:bg-gray-600 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-1 disabled:cursor-default disabled:checked:border-gray-400 disabled:checked:bg-gray-400"
              type="checkbox"
              checked={checked.includes(i)}
              on:input={(e) => handleCheck(e, i)}
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
          class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
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
        <td class="px-6 py-4"> {token.values.consumers.length} </td>
        <td class="px-6 py-4 whitespace-nowrap space-x-2">
          <button
            class="text-gray-700 hover:text-gray-500 transition-colors duration-300"
            type="button"
            on:click={() => handleCopyAction(token)}
          >
            Copy
          </button>
          <button
            class="text-red-700 hover:text-red-500 transition-colors duration-300"
            type="button"
            on:click={() => handleDeleteAction(token)}
          >
            Delete
          </button>
        </td>
      </tr>
    {/each}
  </svelte:fragment>
</Table>

{#if create}
  <Token
    on:exit={() => {
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
