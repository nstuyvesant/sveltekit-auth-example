<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ session }) => {
    const authorized = ['admin', 'teacher', 'student']
		if (!authorized.includes(session.user?.role)) {
			return {
				status: 302,
				redirect: '/login?referrer=/profile'
			}
		}

    return {
      props: {
        user: session.user
      }
    }
  }
</script>

<script lang="ts">
  export let user

  let focusedField: HTMLInputElement
  let displayedError: string

  async function update() {

  }
</script>

<div class="d-flex justify-content-center my-3">
  <div class="card login">
    <div class="card-body">
      <h4><strong>Profile</strong></h4>
      <p>Update your information.</p>
      <form autocomplete="on" novalidate class="mt-3">
        {#if !user.email.includes('gmail.com')}
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input bind:this={focusedField} type="email" class="form-control is-large" bind:value={user.email} placeholder="Email" id="email" autocomplete="email"/>
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input type="password" id="password" class="form-control is-large" bind:value={user.password} placeholder="Password"/>
            <div class="form-text">Password minimum length 8, must have one capital letter, 1 number, and one unique character.</div>
          </div>
        {/if}
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

        <button type="button" on:click={update} class="btn btn-primary btn-lg">Update</button>
      </form>
    </div>
  </div>
</div>
