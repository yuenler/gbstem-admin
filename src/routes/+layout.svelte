<script lang="ts">
  import '../app.css'
  import Alert from '$lib/components/Alert.svelte'
  import Footer from '$lib/components/Footer.svelte'
  import { navigating } from '$app/stores'
  import { onMount } from 'svelte'
  import nProgress from 'nprogress'

  onMount(() => {
    nProgress.configure({ showSpinner: false })
    return navigating.subscribe((navigating) => {
      if (navigating) {
        nProgress.start()
      } else {
        nProgress.done()
      }
    })
  })
</script>

<div class="flex min-h-screen flex-col">
  <div class="grow flex flex-col">
    <slot />
  </div>
  <Footer />
</div>
<Alert />
