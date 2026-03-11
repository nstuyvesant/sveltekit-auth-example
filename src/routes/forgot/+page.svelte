<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { toast } from '../../stores'
	import { focusOnFirstError } from '$lib/focus'

	let focusedField: HTMLInputElement | undefined = $state()
	let email: string = $state('')
	let message: string = $state('')
	let submitted = $state(false)

	onMount(() => {
		focusedField?.focus()
	})

	const sendPasswordReset = async () => {
		message = ''
		const form = document.getElementById('forgot') as HTMLFormElement

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
				$toast = {
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
	id="forgot"
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:mt-20 tw:max-w-sm tw:space-y-4"
	class:submitted
>
	<h4><strong>Forgot password</strong></h4>
	<p>Hey, you're human. We get it.</p>

	<label class="tw:block tw:text-sm tw:font-medium" for="email">
		Email
		<input
			bind:this={focusedField}
			bind:value={email}
			type="email"
			id="email"
			class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
			required
			placeholder="Email"
			autocomplete="email"
		/>
		<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Email address required</span>
	</label>

	{#if message}
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<button
		onclick={sendPasswordReset}
		type="button"
		class="tw:w-full tw:rounded tw:bg-blue-600 tw:px-4 tw:py-2 tw:font-semibold tw:text-white hover:tw:bg-blue-700"
	>
		Send Email
	</button>
</form>


