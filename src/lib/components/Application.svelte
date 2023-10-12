<script lang="ts">
  import {
    type Timestamp,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
  } from 'firebase/firestore'
  import Input from '$lib/components/Input.svelte'
  import Select from '$lib/components/Select.svelte'
  import Textarea from '$lib/components/Textarea.svelte'
  import {
    gendersJson,
    schoolsJson,
    shirtSizeJson,
    dietaryRestrictionsJson,
    rolesJson,
    raceJson,
    prolangsJson,
    statesJson,
    worldJson,
    majorJson,
    reasonsJson,
    experienceJson,
    levelOfStudyJson,
  } from '$lib/data'
  import Card from '$lib/components/Card.svelte'
  import Form from '$lib/components/Form.svelte'
  import { db } from '$lib/client/firebase'
  import Field from '$lib/components/Field.svelte'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'
  import { alert } from '$lib/stores'
  import { cloneDeep } from 'lodash-es'
  import type { FirebaseError } from 'firebase/app'
  import { invalidate } from '$app/navigation'

  export let dialogEl: Dialog
  export let id: string | undefined

  let loading = true
  let disabled = true
  let dbValues: Data.Application<'client'>
  const defaultValues: Data.Application<'client'> = {
    personal: {
      email: '',
      firstName: '',
      lastName: '',
      age: 0,
      gender: '',
      race: [],
      underrepresented: '',
      phoneNumber: '',
      countryOfResidence: '',
      shippingAddress: '',
      shippingCity: '',
      shippingState: '',
      shippingCountry: '',
      shippingZipCode: '',
      dietaryRestrictions: [],
    },
    academic: {
      enrolled: false,
      currentSchool: '',
      graduationYear: new Date().getFullYear(),
      major: '',
      affiliated: false,
      levelOfStudy: '',
    },
    hackathon: {
      shirtSize: '',
      firstHackathon: false,
      previouslyParticipated: false,
      ableToAttend: false,
      reason: '',
    },
    openResponse: {
      roles: [],
      otherRole: '',
      prolangs: [],
      otherProlang: '',
      experience: '',
      whyHh: '',
      project: '',
      predictions: '',
      resume: {
        url: '',
        name: '',
      },
      resumeShare: false,
    },
    agreements: {
      codeOfConduct: false,
      sharing: false,
      mlhEmails: false,
      submitting: false,
    },
    meta: {
      hhid: '',
      uid: '',
      submitted: false,
      decision: null,
    },
    timestamps: {
      created: serverTimestamp() as Timestamp,
      updated: serverTimestamp() as Timestamp,
    },
  }
  let values: Data.Application<'client'> = cloneDeep(defaultValues)
  let decision: Data.Decision | null
  $: if (id !== undefined) {
    loading = true
    disabled = true
    values = cloneDeep(defaultValues)
    getDoc(doc(db, 'applications', id)).then((applicationSnapshot) => {
      const data = applicationSnapshot.data() as Data.Application<'client'>
      if (applicationSnapshot.exists()) {
        values = cloneDeep(data)
        dbValues = cloneDeep(data)
        if (data.meta.decision) {
          getDoc(data.meta.decision).then((decisionSnapshot) => {
            const data = decisionSnapshot.data() as { type: Data.Decision }
            if (decisionSnapshot.exists()) {
              decision = data.type
            } else {
              decision = null
            }
            loading = false
          })
        } else {
          decision = null
          loading = false
        }
      } else {
        alert.trigger('error', 'Application not found.')
      }
    })
  }
  function handleDecision(newDecision: Data.Decision) {
    const frozenId = id
    loading = true
    if (frozenId !== undefined) {
      setDoc(doc(db, 'decisions', frozenId), {
        type: newDecision,
      })
        .then(() => {
          updateDoc(doc(db, 'applications', frozenId), {
            'meta.decision': doc(db, 'decisions', frozenId),
          })
            .then(() => {
              invalidate('app:applications').then(() => {
                alert.trigger('success', 'Decision updated successfully.')
                decision = newDecision
                loading = false
              })
            })
            .catch(() => {
              loading = false
            })
        })
        .catch(() => {
          alert.trigger('error', 'Something went wrong. Please try again.')
          loading = false
        })
    }
  }
  function handleEdit() {
    disabled = false
  }
  function handleSaveChanges() {
    loading = true
    disabled = true
    if (id !== undefined) {
      setDoc(doc(db, 'applications', id), values)
        .then(() => {
          invalidate('app:applications').then(() => {
            alert.trigger('success', 'Changes were saved successfully.')
            loading = false
          })
        })
        .catch((err: FirebaseError) => {
          console.log(err)
          alert.trigger('error', err.code, true)
          loading = false
        })
    }
  }
  function handleDeleteChanges() {
    disabled = true
    values = cloneDeep(dbValues)
  }
</script>

<Dialog bind:this={dialogEl} size="full" alert>
  <svelte:fragment slot="title">Application</svelte:fragment>
  <div slot="description">
    <Card class="sticky top-2 z-50 flex justify-between gap-3 p-3 md:p-3">
      <fieldset class="flex gap-3" disabled={loading}>
        {#if disabled}
          <Button
            color={!loading && (decision === null || decision === 'accepted')
              ? 'green'
              : 'gray'}
            class="flex items-center gap-1"
            on:click={() => handleDecision('accepted')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-5 h-5"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Accept</span></Button
          >
          <Button
            color={!loading && (decision === null || decision === 'waitlisted')
              ? 'yellow'
              : 'gray'}
            class="flex items-center gap-1"
            on:click={() => handleDecision('waitlisted')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-5 h-5"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Waitlist</span></Button
          >
          <Button
            color={!loading && (decision === null || decision === 'rejected')
              ? 'red'
              : 'gray'}
            class="flex items-center gap-1"
            on:click={() => handleDecision('rejected')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-5 h-5"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Reject</span></Button
          >
        {:else}
          <Button color="green" on:click={handleSaveChanges}
            >Save changes</Button
          >
          <Button color="red" on:click={handleDeleteChanges}
            >Delete changes</Button
          >
        {/if}
      </fieldset>
      <div class="flex gap-3">
        {#if disabled}
          <Button on:click={handleEdit}>Edit</Button>
        {/if}
        <Button on:click={dialogEl.cancel}>Close</Button>
      </div>
    </Card>
    <div class="mt-4 flex justify-center">
      <Form class="max-w-2xl">
        <fieldset class="space-y-14" {disabled}>
          {#if !loading && ((!values.academic.affiliated && values.personal.age < 18) || !values.academic.enrolled || (!values.academic.levelOfStudy
                .toLowerCase()
                .includes('undergraduate') && !values.academic.levelOfStudy
                  .toLowerCase()
                  .includes('secondary')))}
            <Card class="bg-red-200">
              <b>Please reject this application.</b>
              {#if !values.academic.affiliated && values.personal.age < 18}
                Person is not a Harvard student and is under 18.
              {:else if !values.academic.enrolled || (!values.academic.levelOfStudy
                  .toLowerCase()
                  .includes('undergraduate') && !values.academic.levelOfStudy
                    .toLowerCase()
                    .includes('secondary'))}
                Person is not an undergraduate student.
              {/if}
            </Card>
          {/if}
          <div class="grid gap-4">
            <span class="font-bold text-2xl">Personal</span>
            <Card class="space-y-3">
              <Field>
                {`Name: ${values.personal.firstName} ${values.personal.lastName}`}
              </Field>
              <Field>{`Email: ${values.personal.email}`}</Field>
              <div class="text-sm">
                {#if values.meta.submitted}
                  The above name and email was the copy submitted on your
                  application.
                {:else}
                  Wrong name or email? Go to your <a
                    class="link"
                    href="/profile">profile</a
                  > to update your information. Once you submit, updates on your
                  profile won't be reflected on your application.
                {/if}
              </div>
            </Card>
            {#if values.openResponse.resume.url === ''}
              <Card>No resume uploaded.</Card>
            {:else}
              <a
                href={values.openResponse.resume.url}
                target="_blank"
                rel="noreferrer"
              >
                <Card class="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-5 w-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <span>{`${values.openResponse.resume.name} (resume)`}</span>
                </Card>
              </a>
            {/if}
            <Input
              class="w-24"
              type="number"
              bind:value={values.personal.age}
              label="How old will you be on October 20th, 2023?"
              min="0"
              max="100"
              required
            />
            <Select
              bind:value={values.personal.gender}
              label="Gender"
              options={gendersJson}
              floating
              required
            />
            <div class="grid gap-1">
              <span>Race / ethnicity (check all that apply)</span>
              <div class="grid grid-cols-2">
                {#each raceJson as race}
                  <Input
                    type="checkbox"
                    bind:value={values.personal.race}
                    label={race.name}
                  />
                {/each}
              </div>
            </div>
            <Select
              bind:value={values.personal.underrepresented}
              label="Do you identify as part of an underrepresented group in the technology industry?"
              options={[{ name: 'Yes' }, { name: 'No' }, { name: 'Unsure' }]}
              required
            />
            <Input
              type="tel"
              bind:value={values.personal.phoneNumber}
              label="Phone number"
              floating
              required
              pattern="[\d\s\-\+]+"
            />
            <Select
              bind:value={values.personal.countryOfResidence}
              label="Country of residence"
              options={worldJson}
              floating
              required
            />
            <Input
              type="text"
              bind:value={values.personal.shippingAddress}
              label="Shipping Address"
              floating
              required
            />
            <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
              <Input
                type="text"
                bind:value={values.personal.shippingCity}
                label="City"
                floating
                required
              />
              <Select
                bind:value={values.personal.shippingState}
                label="State"
                options={statesJson}
                floating
                required
              />
            </div>
            <div class="grid gap-1 sm:grid-cols-2 sm:gap-3">
              <Select
                bind:value={values.personal.shippingCountry}
                label="Country"
                options={worldJson}
                floating
                required
              />
              <Input
                type="text"
                bind:value={values.personal.shippingZipCode}
                label="Zip code"
                floating
                required
              />
            </div>
            <div class="mt-2 grid gap-1">
              <span> Do you have any dietary restrictions?</span>
              <div class="grid grid-cols-2">
                {#each dietaryRestrictionsJson as dietaryRestriction}
                  <Input
                    type="checkbox"
                    bind:value={values.personal.dietaryRestrictions}
                    label={dietaryRestriction.name}
                  />
                {/each}
              </div>
            </div>
          </div>
          <div class="grid gap-4">
            <span class="font-bold text-2xl">Academic</span>
            <Select
              bind:value={values.academic.levelOfStudy}
              label="What is your current education level?"
              options={levelOfStudyJson}
              floating
              required
            />
            <Input
              type="checkbox"
              bind:value={values.academic.enrolled}
              label="Will you be pursuing an undergraduate degree program at a university on October 20th, 2023?"
              required
            />
            <div class="grid gap-1 sm:grid-cols-3 sm:gap-3">
              <div class="sm:col-span-2">
                <Select
                  bind:value={values.academic.currentSchool}
                  label="Current school"
                  options={schoolsJson}
                  floating
                  required
                />
              </div>
              <Input
                type="number"
                bind:value={values.academic.graduationYear}
                label="Graduation year"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 20}
                floating
                required
              />
            </div>
            <Select
              bind:value={values.academic.major}
              label="Major / field of study"
              options={majorJson}
              floating
              required
            />
            <Input
              type="checkbox"
              bind:value={values.academic.affiliated}
              label="Are you affiliated with Harvard University? If so, make sure
        your profile uses your Harvard email."
              validations={[
                [
                  values.academic.affiliated &&
                    !values.personal.email.includes('harvard'),
                  'If you are affiliated, please go to your profile to change to a Harvard email.',
                ],
              ]}
            />
          </div>
          <div class="grid gap-4">
            <span class="font-bold text-2xl">Hackathon</span>
            <div class="grid grid-cols-2 sm:grid-cols-3">
              <Select
                bind:value={values.hackathon.shirtSize}
                label="Shirt size"
                options={shirtSizeJson}
                floating
                required
              />
            </div>
            <Input
              type="checkbox"
              bind:value={values.hackathon.firstHackathon}
              label="Will HackHarvard be your first hackathon?"
            />
            {#if !values.hackathon.firstHackathon}
              <Input
                type="checkbox"
                bind:value={values.hackathon.previouslyParticipated}
                label="Have you previously participated at a HackHarvard hackathon?"
              />
            {/if}
            <Input
              type="checkbox"
              bind:value={values.hackathon.ableToAttend}
              label="HackHarvard is an in-person event. Will you be able to be in Cambridge, MA, United States, considering both the legal requirements for international students and the logistical aspects, on October 20th, 2023?"
              required
            />
            <Select
              bind:value={values.hackathon.reason}
              label="How did you learn about HackHarvard?"
              options={reasonsJson}
              required
            />
          </div>
          <div class="grid gap-4">
            <span class="font-bold text-2xl">Open Response</span>
            <div class="grid gap-1">
              <span>
                What roles best fit your capabilities on a hackathon team?<span
                  class="text-red-500"
                >
                  *
                </span>
              </span>
              <div class="grid grid-cols-2 gap-2">
                {#each rolesJson as role}
                  <Input
                    type="checkbox"
                    bind:value={values.openResponse.roles}
                    label={role.name}
                  />
                {/each}
              </div>
              {#if values.openResponse.roles.includes('other')}
                <Textarea
                  bind:value={values.openResponse.otherRole}
                  label="If other, what other roles could you see yourself playing? (200 char limit)"
                  required
                  rows={1}
                  maxlength={200}
                />
              {/if}
            </div>
            <div class="grid gap-1">
              <span>
                Check up to 5 of the programming languages that you feel most
                comfortable in.<span class="text-red-500"> * </span>
              </span>
              <div class="grid grid-cols-2 gap-2">
                {#each prolangsJson as prolang}
                  <Input
                    type="checkbox"
                    bind:value={values.openResponse.prolangs}
                    label={prolang.name}
                    validations={[
                      [
                        values.openResponse.prolangs.length > 5,
                        'Check up to 5 programming languages only.',
                      ],
                    ]}
                    required
                  />
                {/each}
              </div>
              {#if values.openResponse.prolangs.includes('other')}
                <Textarea
                  bind:value={values.openResponse.otherProlang}
                  label="If other, what other programming languages? (200 char limit)"
                  required
                  rows={1}
                  maxlength={200}
                />
              {/if}
            </div>
            <Select
              bind:value={values.openResponse.experience}
              label="How much experience do you have with computer science?"
              options={experienceJson}
              required
            />
            <Textarea
              bind:value={values.openResponse.whyHh}
              label={`Share your goals and aspirations for this event and how you plan to make the most of your HackHarvard experience. What specific areas are you eager to learn more about, and what skills or technologies are you excited to acquire or improve? (500 char limit)`}
              required
              maxlength={500}
            />
            <Textarea
              bind:value={values.openResponse.project}
              label={`HackHarvard is all about sparking creativity and making a positive difference through innovative projects. We'd love to hear about a project you've been part of that embodies this spirit. How did your project bring a touch of magic or create a lasting impact, whether big or small, on the people or community it reached? (500 char limit)`}
              required
              maxlength={500}
            />
            <Textarea
              bind:value={values.openResponse.predictions}
              label={`In line with the theme "Hack to the Future" for HackHarvard 2023, we invite you to unleash your creativity and envision three predictions for the year 2073. Let your imagination soar as you consider how the world may have transformed. Did OpenAI create AGI? Is Taylor Swift’s granddaughter allergic to tree nuts? Does the iPhone 55 have a headphone jack? Are cat videos still funny? Share your captivating predictions with us! (500 char limit)`}
              required
              maxlength={500}
            />
            <Input
              type="checkbox"
              bind:value={values.openResponse.resumeShare}
              label="If you are accepted to HackHarvard 2023, would you like us to share your resume with our sponsors for potential recruitment opportunities?"
            />
          </div>
          <div class="grid gap-4">
            <span class="font-bold text-2xl">Agreements</span>
            <Input
              type="checkbox"
              bind:value={values.agreements.codeOfConduct}
              label="I have read and agree to the MLH Code of Conduct (https://static.mlh.io/docs/mlh-code-of-conduct.pdf)."
              required
            />
            <Input
              type="checkbox"
              bind:value={values.agreements.sharing}
              label="I authorize you to share my application/registration information with Major League Hacking for event administration, ranking, and MLH administration in-line with the MLH Privacy Policy (https://mlh.io/privacy). I further agree to the terms of both the MLH Contest Terms and Conditions (https://github.com/MLH/mlh-policies/blob/main/contest-terms.md)and the MLH Privacy Policy (https://mlh.io/privacy)"
              required
            />
            <Input
              type="checkbox"
              bind:value={values.agreements.mlhEmails}
              label="I authorize MLH to send me occasional emails about relevant events, career opportunities, and community announcements."
            />
            <Input
              type="checkbox"
              bind:value={values.agreements.submitting}
              label="I understand submitting means I can no longer make changes to my application. Don't check this box until you are sure that you are ready to submit."
              required
            />
          </div>
        </fieldset>
      </Form>
    </div>
  </div>
</Dialog>
