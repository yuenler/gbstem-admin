<script>
  import PageLayout from '$lib/components/PageLayout.svelte'
  import ApplyForm from '$lib/components/forms/ApplyForm.svelte'
</script>

<svelte:head>
  <title>Apply</title>
</svelte:head>

<PageLayout>
  <svelte:fragment slot="title">Apply</svelte:fragment>
  <ApplyForm />
</PageLayout>
