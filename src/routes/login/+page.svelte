<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { loginSession } from '../../stores'
	import { focusOnFirstError } from '$lib/focus'
	import { initializeGoogleAccounts, renderGoogleButton } from '$lib/google'

	let focusedField: HTMLInputElement | undefined = $state()
	let message = $state('')
	let submitted = $state(false)
	const credentials: Credentials = $state({
		email: '',
		password: ''
	})

	async function login() {
		message = ''
		submitted = false
		const form = document.getElementById('signIn') as HTMLFormElement

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
				loginSession.set(fromEndpoint.user)
				const { role } = fromEndpoint.user
				const referrer = page.url.searchParams.get('referrer')
				if (referrer) goto(referrer)
				switch (role) {
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
	id="signIn"
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:mt-20 tw:max-w-sm tw:space-y-4"
	class:submitted
>
	<h4><strong>Sign In</strong></h4>
	<p>Welcome back.</p>

	<div id="googleButton"></div>

	<div class="tw:flex tw:items-center tw:gap-2 tw:text-gray-400 tw:text-sm">
		<span class="tw:flex-1 tw:border-t tw:border-gray-300"></span>
		<span>or</span>
		<span class="tw:flex-1 tw:border-t tw:border-gray-300"></span>
	</div>

	<label class="tw:block tw:text-sm tw:font-medium" for="email">
		Email
		<input
			type="email"
			class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
			bind:this={focusedField}
			bind:value={credentials.email}
			required
			placeholder="Email"
			autocomplete="email"
		/>
		<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Email address required</span>
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="password">
		Password
		<input
			class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
			type="password"
			bind:value={credentials.password}
			required
			minlength="8"
			maxlength="80"
			placeholder="Password"
			autocomplete="current-password"
		/>
		<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Password with 8 chars or more required</span>
		<span class="tw:text-xs tw:text-gray-500">
			Minimum 8 characters, one capital letter, one number, one special character.
		</span>
	</label>

	<a href="/forgot" class="tw:text-sm tw:text-gray-500">Forgot Password?</a>

	{#if message}
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<button onclick={login} type="button" class="tw:w-full tw:rounded tw:bg-blue-600 tw:px-4 tw:py-2 tw:font-semibold tw:text-white hover:tw:bg-blue-700">
		Sign In
	</button>

	<p class="tw:text-center tw:text-sm">
		<a href="/register" class="tw:text-gray-500">Don't have an account?</a>
	</p>
</form>
