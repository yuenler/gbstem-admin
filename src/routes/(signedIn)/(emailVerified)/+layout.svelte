<script lang="ts">
  import { user } from '$lib/client/firebase'
  import { onMount } from 'svelte'

  onMount(() =>
    user.subscribe((user) => {
      if (user) {
        if (localStorage.getItem('emailVerified') === 'false') {
          user.object.reload().then(() => {
            user.object.getIdToken(true).then(() => {
              localStorage.removeItem('emailVerified')
            })
          })
        }
      }
    }),
  )
</script>

<slot />
