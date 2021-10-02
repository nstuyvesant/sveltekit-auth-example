<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'

  export const prerender = true

  let focusedField: HTMLInputElement

  let email: string

  let message: string

  onMount(() => {
    focusedField.focus()
  })

  const sendPasswordReset = () => {
    message = ''
    if (email.toLowerCase().includes('gmail.com')) {
      return message = 'GMail passwords must be reset on Manage Your Google Account.'
    }

    // TODO: send email to /auth/forgot
    // TODO: show Toast
    goto('/')
  }
</script>

<svelte:head>
  <title>Forgot Password</title>
</svelte:head>

<div class="d-flex justify-content-center mt-5">
  <div class="card login">
    <div class="card-body">
      <form autocomplete="on" novalidate>
        <h4><strong>Forgot password</strong></h4>
        <p>It happens to all of us.</p>
        <div class="mb-3">
          <label class="form-label" for="email">Email</label>
          <input type="email" id="email" class="form-control is-large" bind:this={focusedField} bind:value={email} placeholder="Email" autocomplete="email"/>
        </div>
        {#if message}
          <p class="text-danger">{message}</p>
        {/if}
        <div class="d-grid gap-2">
          <button on:click|preventDefault={sendPasswordReset} class="btn btn-primary btn-lg">Send Email</button>
        </div>
      </form>
    </div>
  </div>
</div>