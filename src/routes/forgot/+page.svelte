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

	onMount(() => {
		focusedField?.focus()
	})

	const sendPasswordReset = async () => {
		message = ''
		const form = formEl!

		if (form.checkValidity()) {
			if (email.toLowerCase().includes('gmail.com')) {
				return (message = 'Gmail passwords must be reset on Manage Your Google Account.')
			}
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
	onsubmit={(e) => { e.preventDefault(); sendPasswordReset() }}
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

	<button
		type="submit"
		class="btn-primary"
	>
		Send Email
	</button>
</form>


