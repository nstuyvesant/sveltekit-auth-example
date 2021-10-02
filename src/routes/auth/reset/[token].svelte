<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'
  export const load: Load = async ({ page }) => {
    return {
      props: {
        token: page.params.token
      }
    }
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'

  export const prerender = true
  export let token: string

  let focusedField: HTMLInputElement
  let password: string
  let passwordConfirm: string
  let message: string

  onMount(() => {
    focusedField.focus()
  })

  const resetPassword = () => {
    message = ''
    // TODO: POST token and password to /auth/reset
    // TODO: show Toast
    goto('/login')
  }
</script>

<svelte:head>
  <title>New Password</title>
</svelte:head>

<div class="d-flex justify-content-center mt-5">
  <div class="card login">
    <div class="card-body">
      <form autocomplete="on" novalidate>
        <h4><strong>New Password</strong></h4>
        <p>Please provide a new password.</p>
        <div class="mb-3">
          <label class="form-label" for="password">Password</label>
          <input class="form-control is-large" id="password" type="password" bind:value={password} bind:this={focusedField} placeholder="Password" autocomplete="new-password"/>
          <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="passwordConfirm">Password (retype)</label>
          <input class="form-control is-large" id="passwordConfirm" type="password" bind:value={passwordConfirm} placeholder="Password (again)" autocomplete="new-password"/>
        </div>

        {#if message}
          <p class="text-danger">{message}</p>
        {/if}
        <div class="d-grid gap-2">
          <button on:click|preventDefault={resetPassword} class="btn btn-primary btn-lg">Send Email</button>
        </div>
      </form>
    </div>
  </div>
</div>
