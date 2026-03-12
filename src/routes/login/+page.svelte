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
	let loading = $state(false)
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
		loading = true
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
		} finally {
			loading = false
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

	<div class="tw:group tw:relative tw:w-full">
		<!-- Real Google button: invisible but receives clicks -->
		<div id="googleButton" class="tw:opacity-0 tw:w-full"></div>
		<!-- Visual overlay: looks good, no pointer events -->
		<div class="tw:pointer-events-none tw:absolute tw:inset-0 tw:flex tw:items-center tw:justify-center tw:gap-3 tw:rounded tw:border tw:border-gray-300 tw:bg-white tw:group-hover:bg-gray-50 tw:text-sm tw:font-medium tw:text-gray-700 tw:dark:bg-gray-800 tw:dark:group-hover:bg-gray-700 tw:dark:border-gray-600 tw:dark:text-gray-200">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
				<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
				<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
				<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
			</svg>
			Sign in with Google
		</div>
	</div>

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

	<button type="submit" class="btn-primary" disabled={loading}>
		{loading ? 'Signing in...' : 'Sign In'}
	</button>

	<p class="tw:text-center tw:text-sm">
		<a href="/register" class="tw:text-gray-500">Don't have an account?</a>
	</p>
</form>
