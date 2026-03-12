<script lang="ts">
	import type { PageData } from './$types'
	import { untrack } from 'svelte'
	import { onMount } from 'svelte'
	import { focusOnFirstError } from '$lib/focus'
	import { appState } from '$lib/app-state.svelte'

	interface Props {
		data: PageData
	}

	let { data }: Props = $props()
	// untrack: intentionally take a one-time snapshot of server data for local form editing
	let user: User = $state(untrack(() => ({ ...data.user })))

	const passwordPattern = '(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}'

	let focusedField: HTMLInputElement | undefined = $state()
	let message = $state('')
	let confirmPassword: HTMLInputElement | undefined = $state()
	let submitted = $state(false)
	let passwordMismatch = $state(false)

	onMount(() => {
		focusedField?.focus()
	})

	async function update() {
		message = ''
		submitted = false
		passwordMismatch = false
		const form = document.getElementById('profile') as HTMLFormElement

		if (!user?.email?.includes('gmail.com') && !passwordMatch()) {
			passwordMismatch = true
			return
		}

		if (form.checkValidity()) {
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
			appState.user = JSON.parse(JSON.stringify(user)) // update app state so navbar reflects changes
		} else {
			submitted = true
			focusOnFirstError(form)
		}
	}

	const passwordMatch = () => {
		if (!user.password) user.password = ''
		return user.password == confirmPassword?.value
	}
</script>

<svelte:head>
	<title>Profile</title>
</svelte:head>

<form
	id="profile"
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:my-8 tw:max-w-sm tw:space-y-4"
	class:submitted
	onsubmit={(e) => { e.preventDefault(); update() }}
>
	<h4>Profile</h4>
	<p>Update your information.</p>

	{#if !user?.email?.includes('gmail.com')}
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
				minlength="8"
				maxlength="80"
				pattern={passwordPattern}
				placeholder="Password"
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
				required={!!user.password}
				minlength="8"
				maxlength="80"
				placeholder="Password (again)"
				autocomplete="new-password"
			/>
			{#if passwordMismatch}
				<span class="tw:text-xs tw:text-red-600 tw:mt-0.5">Passwords must match</span>
			{/if}
		</label>
	{/if}

	<label class="tw:block tw:text-sm tw:font-medium" for="firstName">
		First name
		<input
			bind:this={focusedField}
			bind:value={user.firstName}
			class="form-input-validated"
			id="firstName"
			required
			placeholder="First name"
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
			required
			placeholder="Last name"
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
		<p>{message}</p>
	{/if}

	<button
		type="submit"
		class="btn-primary"
	>
		Update
	</button>
</form>
