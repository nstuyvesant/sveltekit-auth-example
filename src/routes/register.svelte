<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ session }) => {
		if (session.user) { // Do not display if user is logged in
			return {
				status: 302,
				redirect: '/'
			}
		}
		return {}
	}
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page, session } from '$app/stores'
  import useAuth from '$lib/auth'

  const { initializeSignInWithGoogle, registerLocal } = useAuth(page, session, goto)

  let focusedField: HTMLInputElement

  let user = {
    firstName: '',
    lastName: '',
    password: '',
    email: '',
    phone: ''
  }
  let displayedError

  async function register() {
    displayedError = undefined
    try {
      await registerLocal(user)
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
  <title>Register</title>
</svelte:head>

<div class="d-flex justify-content-center my-3">
  <div class="card login">
    <div class="card-body">
      <h4><strong>Register</strong></h4>
      <p>Welcome to our community.</p>
      <form autocomplete="on" novalidate class="mt-3">
        <div class="mb-3">
          <div id="googleButton"></div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="email">Email</label>
          <input bind:this={focusedField} type="email" class="form-control is-large" bind:value={user.email} placeholder="Email" id="email" autocomplete="email"/>
        </div>
        <div class="mb-3">
          <label class="form-label" for="password">Password</label>
          <input type="password" id="password" class="form-control is-large" bind:value={user.password} placeholder="Password"/>
          <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="firstName">First name</label>
          <input bind:value={user.firstName} class="form-control" id="firstName" placeholder="First name" autocomplete="given-name"/>
        </div>
        <div class="mb-3">
          <label class="form-label" for="lastName">Last name</label>
          <input bind:value={user.lastName} class="form-control" id="lastName" placeholder="Last name" autocomplete="family-name"/>
        </div>
        <div class="mb-3">
          <label class="form-label" for="phone">Phone</label>
          <input type="tel" bind:value={user.phone} id="phone" class="form-control" placeholder="Phone" autocomplete="tel-local"/>
        </div>
      
        {#if displayedError}
          <p>{displayedError}</p>
        {/if}
      
        <button type="button" on:click={register} class="btn btn-primary btn-lg">Register</button>
      </form>
    </div>
  </div>
</div>
