<script lang="ts">
	import type { PageData } from './$types'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { appState } from '$lib/app-state.svelte'
	import { focusOnFirstError } from '$lib/focus'
	import Turnstile from '$lib/Turnstile.svelte'

	/** Props for the password-reset page. */
	interface Props {
		/** Server data containing the password-reset token from the URL segment. */
		data: PageData
	}

	let { data }: Props = $props()

	let focusedField: HTMLInputElement | undefined = $state()
	let formEl: HTMLFormElement | undefined = $state()
	let password = $state('')
	let confirmPassword: HTMLInputElement | undefined = $state()
	let message = $state('')
	let submitted = $state(false)
	let passwordMismatch = $state(false)
	let loading = $state(false)
	let turnstileToken = $state('')
	let turnstile: Turnstile | undefined = $state()

	onMount(() => {
		// Remove the token from the URL to prevent it appearing in logs and Referer headers
		history.replaceState('', document.title, '/auth/reset')
		focusedField?.focus()
	})

	/** Returns `true` if the password and confirm-password fields match. */
	const passwordMatch = () => {
		if (!password) password = ''
		return password == confirmPassword?.value
	}

	/**
	 * Submits the new password to `/auth/reset` (PUT).
	 *
	 * Validates that the passwords match and the form is valid before sending.
	 * On success, shows a toast notification and redirects to `/login`.
	 * On failure, displays the error message returned by the server.
	 */
	const resetPassword = async () => {
		message = ''
		submitted = false
		passwordMismatch = false
		const form = formEl!

		if (!passwordMatch()) {
			passwordMismatch = true
			return
		}

		if (form.checkValidity()) {
			if (!turnstileToken) {
				message = 'Please complete the security challenge.'
				return
			}
			loading = true
			try {
				const url = `/auth/reset`
				const res = await fetch(url, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						token: data.token,
						password,
						turnstileToken
					})
				})

				if (res.ok) {
					appState.toast = {
						title: 'Password Reset Successful',
						body: 'Your password was reset. Please login.',
						isOpen: true
					}

					goto('/login')
				} else {
					const body = await res.json()
					console.log('Failed reset', body)
					message = body.message
				}
			} finally {
				loading = false
			}
		} else {
			submitted = true
			focusOnFirstError(form)
		}
	}
</script>

<svelte:head>
	<title>New Password</title>
</svelte:head>

<form
	bind:this={formEl}
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:mt-20 tw:max-w-sm tw:space-y-4"
	class:submitted
	onsubmit={e => {
		e.preventDefault()
		resetPassword()
	}}
>
	<h4>New Password</h4>
	<p>Please provide a new password.</p>

	<label class="tw:block tw:text-sm tw:font-medium" for="password">
		Password
		<input
			class="form-input-validated"
			id="password"
			type="password"
			bind:value={password}
			bind:this={focusedField}
			required
			minlength="8"
			maxlength="80"
			placeholder="Password"
			autocomplete="new-password"
		/>
		<span class="form-error">Password with 8 chars or more required</span>
		<span class="tw:text-xs tw:text-gray-500">
			Minimum 8 characters, one capital letter, one number, one special character.
		</span>
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="passwordConfirm">
		Password (retype)
		<input
			class="form-input"
			class:tw:border-red-500={passwordMismatch}
			id="passwordConfirm"
			type="password"
			required={!!password}
			bind:this={confirmPassword}
			minlength="8"
			maxlength="80"
			placeholder="Password (again)"
			autocomplete="new-password"
		/>
		{#if passwordMismatch}
			<span class="tw:mt-0.5 tw:text-xs tw:text-red-600">Passwords must match</span>
		{/if}
	</label>

	{#if message}
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<Turnstile bind:this={turnstile} bind:token={turnstileToken} />

	<button type="submit" class="btn-primary" disabled={loading}>
		{loading ? 'Resetting...' : 'Reset Password'}
	</button>
</form>
