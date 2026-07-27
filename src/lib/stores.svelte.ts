type Action = {
  name: string
  color: 'red' | 'blue' | 'gray' | 'green' | 'yellow' | 'purple'
  callback: () => Promise<void>
}

export const dialogState = $state<{ current: string | null }>({
  current: null,
})

export const actionsState = $state<{ current: Action[] | null }>({
  current: null,
})
