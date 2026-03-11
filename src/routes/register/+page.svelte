<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { loginSession } from '../../stores'
	import { focusOnFirstError } from '$lib/focus'
	import { initializeGoogleAccounts, renderGoogleButton } from '$lib/google'

	let focusedField: HTMLInputElement | undefined = $state()

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

	async function register() {
		const form = document.getElementById('register') as HTMLFormElement
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
			loginSession.set(fromEndpoint.user) // update store so user is logged in
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

{#if user}
	<form
		id="register"
		autocomplete="on"
		novalidate
		class="tw:mx-auto tw:my-8 tw:max-w-sm tw:space-y-4"
		class:submitted
	>
		<h4><strong>Register</strong></h4>
		<p>Welcome to our community.</p>

		<div id="googleButton"></div>

		<label class="tw:block tw:text-sm tw:font-medium" for="email">
			Email
			<input
				bind:this={focusedField}
				type="email"
				class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
				bind:value={user.email}
				required
				placeholder="Email"
				id="email"
				autocomplete="email"
			/>
			<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Email address required</span>
		</label>

		<label class="tw:block tw:text-sm tw:font-medium" for="password">
			Password
			<input
				type="password"
				id="password"
				class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
				bind:value={user.password}
				required
				minlength="8"
				maxlength="80"
				placeholder="Password"
				autocomplete="new-password"
			/>
			<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Password with 8 chars or more required</span>
			<span class="tw:text-xs tw:text-gray-500">
				Minimum 8 characters, one capital letter, one number, one special character.
			</span>
		</label>

		<label class="tw:block tw:text-sm tw:font-medium" for="confirmPassword">
			Confirm password
			<input
				type="password"
				id="confirmPassword"
				class="tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500"
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
			<span class="tw:text-xs tw:text-gray-500">
				Minimum 8 characters, one capital letter, one number, one special character.
			</span>
		</label>

		<label class="tw:block tw:text-sm tw:font-medium" for="firstName">
			First name
			<input
				bind:value={user.firstName}
				class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
				id="firstName"
				placeholder="First name"
				required
				autocomplete="given-name"
			/>
			<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">First name required</span>
		</label>

		<label class="tw:block tw:text-sm tw:font-medium" for="lastName">
			Last name
			<input
				bind:value={user.lastName}
				class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
				id="lastName"
				placeholder="Last name"
				required
				autocomplete="family-name"
			/>
			<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Last name required</span>
		</label>

		<label class="tw:block tw:text-sm tw:font-medium" for="phone">
			Phone
			<input
				type="tel"
				bind:value={user.phone}
				id="phone"
				class="tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500"
				placeholder="Phone"
				autocomplete="tel-local"
			/>
		</label>

		{#if message}
			<p class="tw:text-red-600">{message}</p>
		{/if}

		<button
			onclick={register}
			type="button"
			class="tw:w-full tw:rounded tw:bg-blue-600 tw:px-4 tw:py-2 tw:font-semibold tw:text-white hover:tw:bg-blue-700"
		>
			Register
		</button>
	</form>
{/if}
