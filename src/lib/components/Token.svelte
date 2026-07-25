<script lang="ts">
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import { createEventDispatcher } from 'svelte'
  import CreateTokenForm from './forms/CreateTokenForm.svelte'

  const dispatch = createEventDispatcher()
  let dialogEl: any = $state()

  function handleExit() {
    dispatch('exit', true)
  }
</script>

<Dialog
  bind:this={dialogEl}
  alert
  initial
  on:cancel={handleExit}
  on:close={handleExit}
>
  {#snippet title()}
    Token
  {/snippet}
  {#snippet description()}
    <div>
      <CreateTokenForm {dialogEl} />
    </div>
  {/snippet}
</Dialog>
