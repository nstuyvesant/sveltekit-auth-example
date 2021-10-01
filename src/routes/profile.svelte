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
    return {}
  }
</script>

<script lang="ts">
  import { session } from '$app/stores'

  let focusedField: HTMLInputElement
  let message: string

  async function update() {
    const url = '/api/v1/user'
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify($session.user)
    })
    const reply = await res.json()
    message = reply.message
  }
</script>

<div class="d-flex justify-content-center my-3">
  <div class="card login">
    <div class="card-body">
      <h4><strong>Profile</strong></h4>
      <p>Update your information.</p>
      <form autocomplete="on" novalidate class="mt-3">
        {#if !$session.user.email.includes('gmail.com')}
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input bind:this={focusedField} type="email" class="form-control is-large" bind:value={$session.user.email} placeholder="Email" id="email" autocomplete="email"/>
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input type="password" id="password" class="form-control is-large" bind:value={$session.user.password} placeholder="Password"/>
            <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
          </div>
        {/if}
        <div class="mb-3">
          <label class="form-label" for="firstName">First name</label>
          <input bind:value={$session.user.firstName} class="form-control" id="firstName" placeholder="First name" autocomplete="given-name"/>
        </div>
        <div class="mb-3">
          <label class="form-label" for="lastName">Last name</label>
          <input bind:value={$session.user.lastName} class="form-control" id="lastName" placeholder="Last name" autocomplete="family-name"/>
        </div>
        <div class="mb-3">
          <label class="form-label" for="phone">Phone</label>
          <input type="tel" bind:value={$session.user.phone} id="phone" class="form-control" placeholder="Phone" autocomplete="tel-local"/>
        </div>

        {#if message}
          <p>{message}</p>
        {/if}

        <button type="button" on:click={update} class="btn btn-primary btn-lg">Update</button>
      </form>
    </div>
  </div>
</div>
