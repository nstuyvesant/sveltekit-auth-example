<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { toast } from '../stores'
  import { focusOnFirstError } from '$lib/focus'

  export const prerender = true

  let focusedField: HTMLInputElement
  let email: string
  let message: string

  onMount(() => {
    focusedField.focus()
  })

  const sendPasswordReset = async () => {
    message = ''
    const form = document.forms['forgot']

    if (form.checkValidity()) {
      if (email.toLowerCase().includes('gmail.com')) {
        return message = 'GMail passwords must be reset on Manage Your Google Account.'
      }
      const url = `/auth/forgot`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })
    
      if (res.ok) {
        $toast = {
          title: 'Password Reset',
          body: 'Please check your inbox for a password reset email (junk mail, too).',
          isOpen: true
        }
        return goto('/')
      }
    } else {
      form.classList.add('was-validated')
      focusOnFirstError(form)
    }
  }
</script>

<svelte:head>
  <title>Forgot Password</title>
</svelte:head>

<div class="d-flex justify-content-center mt-5">
  <div class="card login">
    <div class="card-body">
      <form id="forgot" autocomplete="on" novalidate>
        <h4><strong>Forgot password</strong></h4>
        <p>Hey, you're human. We get it.</p>
        <div class="mb-3">
          <label class="form-label" for="email">Email</label>
          <input bind:this={focusedField} bind:value={email} type="email" id="email" class="form-control" required placeholder="Email" autocomplete="email"/>
          <div class="invalid-feedback">Email address required</div>
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
