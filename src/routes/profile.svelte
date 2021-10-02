<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit'

  // export const ssr = false
  export const prerender = false

  export const load: Load = ({ session }) => {
    const authorized = ['admin', 'teacher', 'student'] // must be logged-in
		if (!authorized.includes(session.user?.role)) {
			return {
				status: 302,
				redirect: '/login?referrer=/profile'
			}
		}

    return {
      props: {
        // Clone session.user so unsaved changes are NOT retained
        user: JSON.parse(JSON.stringify(session.user))
      }
    }
  }
</script>

<script lang="ts">
  import { session } from '$app/stores'
import { focusOnFirstError } from '$lib/focus';

  let focusedField: HTMLInputElement
  let message: string
  let confirmPassword: HTMLInputElement
  export let user: User

  async function update() {
    message = ''
    const form = document.forms['profile']

    if (!passwordMatch()) {
      confirmPassword.classList.add('is-invalid')
    }

    if (form.checkValidity()) {
      $session.user = JSON.parse(JSON.stringify(user)) // deep clone
      const url = '/api/v1/user'
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
      })
      const reply = await res.json()
      message = reply.message
    } else {
      form.classList.add('was-validated')
      focusOnFirstError(form)
    }

  }

  const passwordMatch = () => {
    if (!user.password) user.password = ''
    return user.password == confirmPassword.value
  }
</script>

<svelte:head>
  <title>Profile</title>
</svelte:head>

<div class="d-flex justify-content-center my-3">
  <div class="card login">
    <div class="card-body">
      <h4><strong>Profile</strong></h4>
      <p>Update your information.</p>
      <form id="profile" autocomplete="on" novalidate class="mt-3">
        {#if !user.email.includes('gmail.com')}
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input bind:this={focusedField} type="email" class="form-control" bind:value={user.email} required placeholder="Email" id="email" autocomplete="email"/>
            <div class="invalid-feedback">Email address required</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input type="password" id="password" class="form-control" bind:value={user.password} minlength="8" maxlength="80" placeholder="Password"/>
            <div class="invalid-feedback">Password with 8 chars or more required</div>
            <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Confirm password</label>
            <input type="password" id="password" class="form-control" bind:this={confirmPassword} required={!!user.password} minlength="8" maxlength="80" placeholder="Password (again)" autocomplete="new-password"/>
            <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
          </div>
        {/if}
        <div class="mb-3">
          <label class="form-label" for="firstName">First name</label>
          <input bind:value={user.firstName} class="form-control" id="firstName" required placeholder="First name" autocomplete="given-name"/>
          <div class="invalid-feedback">First name required</div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="lastName">Last name</label>
          <input bind:value={user.lastName} class="form-control" id="lastName" required placeholder="Last name" autocomplete="family-name"/>
          <div class="invalid-feedback">Last name required</div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="phone">Phone</label>
          <input type="tel" bind:value={user.phone} id="phone" class="form-control" placeholder="Phone" autocomplete="tel-local"/>
        </div>

        {#if message}
          <p>{message}</p>
        {/if} 

        <button type="button" on:click={update} class="btn btn-primary btn-lg">Update</button>
      </form>
    </div>
  </div>
</div>
