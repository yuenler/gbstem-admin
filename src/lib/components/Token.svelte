<script lang="ts">
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import CreateTokenForm from './forms/CreateTokenForm.svelte'

  interface Props {
    onExit?: () => void
  }

  let { onExit }: Props = $props()

  let dialogEl: any = $state()

  function handleExit() {
    onExit?.()
  }
</script>

<Dialog
  bind:this={dialogEl}
  alert
  initial
  onCancel={handleExit}
  onClose={handleExit}
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
