<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { Toast, ToastBody, ToastHeader } from 'sveltestrap'

  export const prerender = true

  let focusedField: HTMLInputElement
  let email: string
  let message: string
  let isOpen = false

  onMount(() => {
    focusedField.focus()
  })

  const toggle = () => {
    isOpen = !isOpen
  }

  const sendPasswordReset = async() => {
    message = ''
    if (email.toLowerCase().includes('gmail.com')) {
      return message = 'GMail passwords must be reset on Manage Your Google Account.'
    }
    const url = `/auth/forgot`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email
      }
    })
    const result = await res.json()
    
    if (res.ok) {
      toggle()
      goto('/')
      return
    }
    message = result.message
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
        <p>Hey, we're human.</p>
        <div class="mb-3">
          <label class="form-label" for="email">Email</label>
          <input bind:this={focusedField} bind:value={email} type="email" id="email" class="form-control is-large" placeholder="Email" autocomplete="email"/>
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

<Toast class="position-fixed top-0 end-0 m-3" autohide={true} delay={4000} duration={800} {isOpen} on:close={() => (isOpen = false)}>
  <ToastHeader class="bg-primary text-white" {toggle}>Password Reset</ToastHeader>
  <ToastBody class="bg-secondary">Please check your inbox for a password reset email.</ToastBody>
</Toast>