<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { appState } from '$lib/app-state.svelte'
	import { focusOnFirstError } from '$lib/focus'
	import { initializeGoogleAccounts, renderGoogleButton } from '$lib/google'

	let focusedField: HTMLInputElement | undefined = $state()
	// Pattern stored as a variable to avoid Svelte parsing `{8,}` as a template expression
	const passwordPattern = '(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}'

	let user: User = $state({
		id: 0,
		role: 'student',
		firstName: '',
		lastName: '',
		password: '',
		email: '',
		phone: ''
	})
	let confirmPassword: HTMLInputElement | undefined = $state()
	let message = $state('')
	let submitted = $state(false)
	let passwordMismatch = $state(false)

	let formEl: HTMLFormElement | undefined = $state()

	async function register() {
		const form = formEl!
		message = ''
		submitted = false
		passwordMismatch = false

		if (!passwordMatch()) {
			passwordMismatch = true
			return
		}

		if (form.checkValidity()) {
			try {
				await registerLocal(user)
			} catch (err) {
				if (err instanceof Error) {
					message = err.message
					console.log('Login error', message)
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

	async function registerLocal(user: User) {
		try {
			const res = await fetch('/auth/register', {
				method: 'POST',
				body: JSON.stringify(user), // server ignores user.role - always set it to 'student' (lowest priv)
				headers: {
					'Content-Type': 'application/json'
				}
			})
			if (!res.ok) {
				if (res.status == 401)
					// user already existed and passwords didn't match (otherwise, we login the user)
					throw new Error('Sorry, that username is already in use.')
				throw new Error(res.statusText) // should only occur if there's a database error
			}

			// res.ok
			const fromEndpoint = await res.json()
			appState.user = fromEndpoint.user // update app state so user is logged in
			goto('/')
		} catch (err) {
			console.error('Register error', err)
			if (err instanceof Error) {
				throw new Error(err.message)
			}
		}
	}

	const passwordMatch = () => {
		if (!user) return false // placate TypeScript
		if (!user.password) user.password = ''
		return user.password == confirmPassword?.value
	}
</script>

<svelte:head>
	<title>Register</title>
</svelte:head>

<form
	bind:this={formEl}
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:my-8 tw:max-w-sm tw:space-y-4"
	class:submitted
	onsubmit={(e) => { e.preventDefault(); register() }}
>
	<h4>Register</h4>
		<p>Welcome to our community.</p>

		<div id="googleButton" class="tw:w-full"></div>

	<label class="tw:block tw:text-sm tw:font-medium" for="email">
		Email
		<input
			bind:this={focusedField}
			type="email"
			class="form-input-validated"
			bind:value={user.email}
			required
			placeholder="Email"
			id="email"
			autocomplete="email"
		/>
		<span class="form-error">Email address required</span>
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="password">
		Password
		<input
			type="password"
			id="password"
			class="form-input-validated"
			bind:value={user.password}
			required
			minlength="8"
			maxlength="80"
			pattern={passwordPattern}
			placeholder="Password"
			autocomplete="new-password"
		/>
		<span class="form-error">Must be 8+ characters with a capital letter, number, and special character</span>
		<span class="tw:text-xs tw:text-gray-500">
			Minimum 8 characters, one capital letter, one number, one special character.
		</span>
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="confirmPassword">
		Confirm password
		<input
			type="password"
			id="confirmPassword"
			class="form-input"
			class:tw:border-red-500={passwordMismatch}
			bind:this={confirmPassword}
			required
			minlength="8"
			maxlength="80"
			placeholder="Password (again)"
			autocomplete="new-password"
		/>
		{#if passwordMismatch}
			<span class="tw:text-xs tw:text-red-600 tw:mt-0.5">Passwords must match</span>
		{/if}
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="firstName">
		First name
		<input
			bind:value={user.firstName}
			class="form-input-validated"
			id="firstName"
			placeholder="First name"
			required
			autocomplete="given-name"
		/>
		<span class="form-error">First name required</span>
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="lastName">
		Last name
		<input
			bind:value={user.lastName}
			class="form-input-validated"
			id="lastName"
			placeholder="Last name"
			required
			autocomplete="family-name"
		/>
		<span class="form-error">Last name required</span>
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="phone">
		Phone
		<input
			type="tel"
			bind:value={user.phone}
			id="phone"
			class="form-input"
			placeholder="Phone"
			autocomplete="tel-local"
		/>
	</label>

	{#if message}
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<button
		type="submit"
		class="btn-primary"
	>
		Register
	</button>
</form>
