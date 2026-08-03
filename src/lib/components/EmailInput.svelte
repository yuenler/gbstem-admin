<script lang="ts">
  import TextInput from './TextInput.svelte'

  interface Props {
    class?:
      | string
      | {
          input?: string
          container?: string
        }
    self?: HTMLInputElement | undefined
    id?: string
    value?: string
    label?: string
    name?: string
    required?: boolean
    validations?: Array<[boolean, string]>
    placeholder?: string | undefined
    [key: string]: any
  }

  let {
    class: className = '',
    self = $bindable(undefined),
    value = $bindable(''),
    label = '',
    required = false,
    ...rest
  }: Props = $props()
</script>

<TextInput
  type="email"
  class={className}
  bind:self
  bind:value
  {label}
  {required}
  {...rest}
/>
