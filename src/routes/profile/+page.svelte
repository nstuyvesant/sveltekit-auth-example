<script lang="ts">
	import type { PageData } from './$types'
	import { untrack } from 'svelte'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { focusOnFirstError } from '$lib/focus'
	import { appState } from '$lib/app-state.svelte'

	/** Props for the profile page. */
	interface Props {
		/** Server data containing the authenticated user's profile. */
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
	let loading = $state(false)
	let deleting = $state(false)

	onMount(() => {
		focusedField?.focus()
	})

	/**
	 * Submits the updated profile to `/api/v1/user` (PUT).
	 *
	 * Skips the password-match check for Gmail users since they manage their
	 * password through Google. On success, syncs {@link appState.user} so the
	 * navbar reflects the changes immediately.
	 */
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
			loading = true
			try {
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
			} finally {
				loading = false
			}
		} else {
			submitted = true
			focusOnFirstError(form)
		}
	}

	/**
	 * Permanently deletes the authenticated user's account after confirmation.
	 *
	 * Sends a DELETE to `/api/v1/user`. On success, clears {@link appState.user}
	 * and redirects to the login page.
	 */
	async function deleteAccount() {
		if (
			!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')
		)
			return
		deleting = true
		try {
			const res = await fetch('/api/v1/user', { method: 'DELETE' })
			if (res.ok) {
				appState.user = undefined
				goto('/login')
			} else {
				message = 'Failed to delete account. Please try again.'
			}
		} finally {
			deleting = false
		}
	}

	/** Returns `true` if the password and confirm-password fields match. */
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
	onsubmit={e => {
		e.preventDefault()
		update()
	}}
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
			<span class="form-error"
				>Must be 8+ characters with a capital letter, number, and special character</span
			>
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
				<span class="tw:mt-0.5 tw:text-xs tw:text-red-600">Passwords must match</span>
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

	<button type="submit" class="btn-primary" disabled={loading}>
		{loading ? 'Updating...' : 'Update'}
	</button>

	<div class="tw:mt-4 tw:border-t tw:border-red-200 tw:pt-4">
		<p class="tw:mb-2 tw:text-sm tw:text-gray-500">Danger zone</p>
		<button
			type="button"
			class="hover:tw:bg-red-700 hover:tw:border-red-700 disabled:tw:opacity-50 disabled:tw:cursor-not-allowed tw:w-full tw:cursor-pointer tw:rounded tw:border tw:border-red-600 tw:bg-red-600 tw:px-4 tw:py-2 tw:text-sm tw:font-medium tw:text-white"
			disabled={deleting}
			onclick={deleteAccount}
		>
			{deleting ? 'Deleting...' : 'Delete my account'}
		</button>
	</div>
</form>
