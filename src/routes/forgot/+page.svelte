<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { appState } from '$lib/app-state.svelte'
	import { focusOnFirstError } from '$lib/focus'

	let focusedField: HTMLInputElement | undefined = $state()
	let formEl: HTMLFormElement | undefined = $state()
	let email: string = $state('')
	let message: string = $state('')
	let submitted = $state(false)
	let loading = $state(false)

	onMount(() => {
		focusedField?.focus()
	})

	/**
	 * Submits a forgot-password request to `/auth/forgot` (POST).
	 *
	 * Gmail addresses are rejected client-side since their passwords must be
	 * managed through Google. For all other addresses a 204 response triggers
	 * a toast notification and redirects to the home page (the server always
	 * returns 204 regardless of whether the email exists, to prevent enumeration).
	 */
	const sendPasswordReset = async () => {
		message = ''
		const form = formEl!

		if (form.checkValidity()) {
			if (email.toLowerCase().includes('gmail.com')) {
				return (message = 'Gmail passwords must be reset on Manage Your Google Account.')
			}
			loading = true
			try {
				const url = `/auth/forgot`
				const res = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ email })
				})

				if (res.ok) {
					appState.toast = {
						title: 'Password Reset',
						body: 'Please check your inbox for a password reset email (junk mail, too).',
						isOpen: true
					}
					return goto('/')
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
	<title>Forgot Password</title>
</svelte:head>

<form
	bind:this={formEl}
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:mt-20 tw:max-w-sm tw:space-y-4"
	class:submitted
	onsubmit={e => {
		e.preventDefault()
		sendPasswordReset()
	}}
>
	<h4>Forgot password</h4>
	<p>Hey, you're human. We get it.</p>

	<label class="tw:block tw:text-sm tw:font-medium" for="email">
		Email
		<input
			bind:this={focusedField}
			bind:value={email}
			type="email"
			id="email"
			class="form-input-validated"
			required
			placeholder="Email"
			autocomplete="email"
		/>
		<span class="form-error">Email address required</span>
	</label>

	{#if message}
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<button type="submit" class="btn-primary" disabled={loading}>
		{loading ? 'Sending...' : 'Send Email'}
	</button>
</form>
