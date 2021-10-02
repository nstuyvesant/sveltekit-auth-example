<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page, session } from '$app/stores'
  import useAuth from '$lib/auth'
  import { focusOnFirstError } from '$lib/focus'

  const { initializeSignInWithGoogle, loginLocal } = useAuth(page, session, goto)

  let focusedField: HTMLInputElement
  let message: string
  const credentials: Credentials = {
    email: '',
    password: ''
  }

  async function login() {
    message = ''
    const form = document.forms['signIn']

    if (form.checkValidity()) {
      try {
        await loginLocal(credentials)
      } catch (err) {
        console.error('Login error', err.message)
        message = err.message
      }
    } else {
      form.classList.add('was-validated')
      focusOnFirstError(form)
    }
  }

  onMount(() => {
    focusedField.focus()
    initializeSignInWithGoogle()
    google.accounts.id.renderButton(
      document.getElementById('googleButton'),
      { theme: 'filled_blue', size: 'large', width: '367' }  // customization attributes
    )
	})
</script>

<svelte:head>
  <title>Login Form</title>
  <meta name='robots' content='noindex, nofollow'/>
</svelte:head>

<div class="d-flex justify-content-center mt-5">
  <div class="card login">
    <div class="card-body">
      <form id="signIn" autocomplete="on" novalidate>
        <h4><strong>Sign In</strong></h4>
        <p>Welcome back.</p>
        <div>
          <div class="mb-3">
            <div id="googleButton"></div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input type="email" class="form-control is-large" bind:this={focusedField} bind:value={credentials.email} required placeholder="Email" autocomplete="email"/>
            <div class="invalid-feedback">Email address required</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input class="form-control is-large" type="password" bind:value={credentials.password} required minlength="8" maxlength="80" placeholder="Password" autocomplete="current-password"/>
            <div class="invalid-feedback">Password with 8 chars or more required</div>
            <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
          </div>
        </div>
        <div>
          <a href="/forgot" class="text-black-50">Forgot Password?</a><br/>
          <br/>
        </div>
        {#if message}
          <p class="text-danger">{message}</p>
        {/if}
        <div class="d-grid gap-2">
          <button on:click|preventDefault={login} class="btn btn-primary btn-lg">Sign In</button>
        </div>
      </form>
    </div>
    <div class="card-footer text-center bg-white">
      <a href="/register" class="text-black-50">Don't have an account?</a>
    </div>
  </div>
</div>

<style lang="scss">
  .login {
    width: 25rem;
  }
</style>