<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { loginSession } from '../../stores'
  import { focusOnFirstError } from '$lib/focus'
  import { initializeGoogleAccounts, renderGoogleButton } from '$lib/google'

  let focusedField: HTMLInputElement
  let message: string
  const credentials: Credentials = {
    email: '',
    password: ''
  }

  async function login() {
    message = ''
    const form = <HTMLFormElement> document.getElementById('signIn')

    if (form.checkValidity()) {
      try {
        await loginLocal(credentials)
      } catch (err) {
        if (err instanceof Error) {
          console.error('Login error', err.message)
          message = err.message
        }
      }
    } else {
      form.classList.add('was-validated')
      focusOnFirstError(form)
    }
  }

  onMount(() => {
    initializeGoogleAccounts()
    renderGoogleButton()

    focusedField.focus()
	})

  async function loginLocal(credentials: Credentials) {
		try {
			const res = await fetch('/auth/login', {
				method: 'POST',
				body: JSON.stringify(credentials),
				headers: {
					'Content-Type': 'application/json'
				}
			})
			const fromEndpoint = await res.json()
			if (res.ok) {
				loginSession.set(fromEndpoint.user)
				const { role } = fromEndpoint.user
        const referrer = $page.url.searchParams.get('referrer')
				if (referrer) goto(referrer)
        switch(role) {
          case 'teacher':
            goto('/teachers')
            break
          case 'admin':
            goto('/admin')
            break
          default:
            goto('/')
        }
			} else {
				throw new Error(fromEndpoint.message)
			}
		} catch (err) {
			if (err instanceof Error) {
				console.error('Login error', err)
			}
		}
	}
</script>

<svelte:head>
  <title>Login Form</title>
  <meta name='robots' content='noindex, nofollow'/>
</svelte:head>

<div class="d-flex justify-content-center mt-5">
  <div class="card">
    <div class="card-body">
      <form id="signIn" autocomplete="on" novalidate>
        <h4><strong>Sign In</strong></h4>
        <p>Welcome back.</p>
        <div>
          <div class="mb-1">
            <div id="googleButton"></div>
          </div>
          <div class="text-centered">
            <div class="strike">
              <span>or</span>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input type="email" class="form-control" bind:this={focusedField} bind:value={credentials.email} required placeholder="Email" autocomplete="email"/>
            <div class="invalid-feedback">Email address required</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input class="form-control" type="password" bind:value={credentials.password} required minlength="8" maxlength="80" placeholder="Password" autocomplete="current-password"/>
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
  .card-body {
    width: 25rem;
  }

  .strike {
    display: block;
    text-align: center;
    overflow: hidden;
    white-space: nowrap; 
  }

  .strike > span {
    position: relative;
    display: inline-block;
  }

  .strike > span:before,
  .strike > span:after {
    content: "";
    position: absolute;
    top: 50%;
    width: 9999px;
    height: 1px;
    background: darkgray;
  }

  .strike > span:before {
    right: 100%;
    margin-right: 10px;
  }

  .strike > span:after {
    left: 100%;
    margin-left: 10px;
  }
</style>