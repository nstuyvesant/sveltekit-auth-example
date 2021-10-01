<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page, session } from '$app/stores'
  import useAuth from '$lib/auth'

  const { initializeSignInWithGoogle, loginLocal } = useAuth(page, session, goto)

  let focusedField: HTMLInputElement

  const credentials: Credentials = {
    email: '',
    password: ''
  }
  let displayedError: string

  async function login() {
    displayedError = undefined
    try {
      await loginLocal(credentials)
    } catch (err) {
      console.error('Login error', err.message)
      displayedError = err.message
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
      <form autocomplete="on" novalidate>
        <h4><strong>Sign In</strong></h4>
        <p>Welcome back.</p>
        <div>
          <div class="mb-3">
            <div id="googleButton"></div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input type="email" class="form-control is-large" bind:this={focusedField} bind:value={credentials.email} placeholder="Email" autocomplete="email"/>
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input class="form-control is-large" type="password" bind:value={credentials.password} placeholder="Password" autocomplete="current-password"/>
            <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
          </div>
        </div>
        <div>
          <a href="/forgot" class="text-black-50">Forgot Password?</a><br/>
          <br/>
        </div>
        {#if displayedError}
          <p class="text-danger">{displayedError}</p>
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