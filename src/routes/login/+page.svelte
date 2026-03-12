<script lang="ts">
	import { onMount } from 'svelte'
	import { appState } from '$lib/app-state.svelte'
	import { focusOnFirstError } from '$lib/focus'
	import { initializeGoogleAccounts, renderGoogleButton } from '$lib/google'
	import { redirectAfterLogin } from '$lib/auth-redirect'

	let focusedField: HTMLInputElement | undefined = $state()
	let formEl: HTMLFormElement | undefined = $state()
	let message = $state('')
	let submitted = $state(false)
	const credentials: Credentials = $state({
		email: '',
		password: ''
	})

	async function login() {
		message = ''
		submitted = false
		const form = formEl!

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
			submitted = true
			focusOnFirstError(form)
		}
	}

	onMount(() => {
		initializeGoogleAccounts()
		renderGoogleButton()

		focusedField?.focus()
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
				appState.user = fromEndpoint.user
				redirectAfterLogin(fromEndpoint.user)
			} else {
				throw new Error(fromEndpoint.message)
			}
		} catch (err) {
			if (err instanceof Error) {
				console.error('Login error', err)
				message = err.message
			}
		}
	}
</script>

<svelte:head>
	<title>Login Form</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<form
	bind:this={formEl}
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:mt-20 tw:max-w-sm tw:space-y-4"
	class:submitted
	onsubmit={(e) => { e.preventDefault(); login() }}
>
	<h4>Sign In</h4>
	<p>Welcome back.</p>

	<div id="googleButton" class="tw:w-full"></div>

	<div class="tw:flex tw:items-center tw:gap-2 tw:text-gray-400 tw:text-sm">
		<span class="tw:flex-1 tw:border-t tw:border-gray-300"></span>
		<span>or</span>
		<span class="tw:flex-1 tw:border-t tw:border-gray-300"></span>
	</div>

	<label class="tw:block tw:text-sm tw:font-medium" for="email">
		Email
		<input
			id="email"
			type="email"
			class="form-input-validated"
			bind:this={focusedField}
			bind:value={credentials.email}
			required
			placeholder="Email"
			autocomplete="email"
		/>
		<span class="form-error">Email address required</span>
	</label>

	<div class="tw:block tw:text-sm tw:font-medium">
		<div class="tw:flex tw:justify-between tw:items-baseline">
			<label for="password">Password</label>
			<a href="/forgot" class="tw:text-xs tw:text-gray-500 tw:font-normal">Forgot password?</a>
		</div>
		<input
			id="password"
			class="form-input-validated"
			type="password"
			bind:value={credentials.password}
			required
			minlength="8"
			maxlength="80"
			placeholder="Password"
			autocomplete="current-password"
		/>
		<span class="form-error">Password with 8 chars or more required</span>
	</div>

	{#if message}
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<button type="submit" class="btn-primary">
		Sign In
	</button>

	<p class="tw:text-center tw:text-sm">
		<a href="/register" class="tw:text-gray-500">Don't have an account?</a>
	</p>
</form>
