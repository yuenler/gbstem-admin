<script lang="ts">
  export let self
  export let applications = []
  export let currentIndex = 0
  export let onChange = index => {}
  $: onChange(currentIndex)
</script>

<div bind:this={self}>
  {#each applications as application, index}
    <div>
      <button
        class="
      {index === currentIndex ? 'bg-gray-200' : 'bg-white'}
      border-b border-gray-200 p-4"
        on:click={() => {
          currentIndex = index
        }}
      >
        <!-- display applicant name, email, school,  -->
        <p>{`${application.personal.firstName.value} ${application.personal.lastName.value}`}</p>
        <p>{application.personal.email.value}</p>
        <p>{application.academic.currentSchool.value}</p>
      </button>
    </div>
  {/each}
</div>
