<script lang="ts">
    import SetInterviewTimesForm from "$lib/components/forms/SetInterviewTimesForm.svelte";
    import PageLayout from "$lib/components/PageLayout.svelte";
</script>

<svelte:head>
  <title>Interview Timeslots</title>
</svelte:head>

<PageLayout cols={2}>
    <svelte:fragment slot="title">Set Interview Timeslots</svelte:fragment>
    <div class="relative w-full">
        <SetInterviewTimesForm/>
    </div>
</PageLayout>