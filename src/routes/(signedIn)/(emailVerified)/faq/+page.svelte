<script lang="ts">
  import Disclosure from '$lib/components/Disclosure.svelte'
  import PageLayout from '$lib/components/PageLayout.svelte'
  import { format } from 'date-fns'
</script>

<svelte:head>
  <title>FAQ</title>
</svelte:head>

<PageLayout>
  <svelte:fragment slot="title">FAQ</svelte:fragment>
  <div class="max-w-2xl w-full space-y-4">
    <Disclosure>
      <svelte:fragment slot="title">Am I eligible to apply?</svelte:fragment>
      <svelte:fragment slot="content">
        As long as you are a student at any accredited college or university in
        the world, are 18 or older, and are currently pursuing an undergraduate
        degree, you are invited to apply to HackHarvard!
      </svelte:fragment>
    </Disclosure>
    <Disclosure>
      <svelte:fragment slot="title"
        >I've verified my email but my application doesn't save or submit!</svelte:fragment
      >
      <svelte:fragment slot="content">
        Please store your application responses in a separate document. Then,
        sign out and sign back in.
      </svelte:fragment>
    </Disclosure>
    <Disclosure>
      <svelte:fragment slot="title">
        I keep encountering an error and can't submit!
      </svelte:fragment>
      <svelte:fragment slot="content">
        Please contact us immediately at <a
          href="mailto:team@hackharvard.io"
          class="link">team@hackharvard.io</a
        >
        with the following content.
        <ol class="list-disc list-inside">
          <li>
            Title should be "[Bug] Portal @ {format(new Date(), 'yyyy.MM.dd')}."
          </li>
          <li>
            In the body of the email, please include your email and HHID, which
            can both be found on your <a href="/profile">profile</a>. Then,
            describe your issue as best as you can; screenshots of the issue as
            well as a copy of your console found in your browser's developer
            tools is extremely helpful.
          </li>
        </ol>
      </svelte:fragment>
    </Disclosure>
  </div>
</PageLayout>
