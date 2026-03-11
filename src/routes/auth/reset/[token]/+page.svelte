<script lang="ts">
	import type { PageData } from './$types'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { toast } from '../../../../stores'
	import { focusOnFirstError } from '$lib/focus'

	interface Props {
		data: PageData
	}

	let { data }: Props = $props()

	let focusedField: HTMLInputElement | undefined = $state()
	let password = $state('')
	let confirmPassword: HTMLInputElement | undefined = $state()
	let message = $state('')
	let submitted = $state(false)
	let passwordMismatch = $state(false)

	onMount(() => {
		focusedField?.focus()
	})

	const passwordMatch = () => {
		if (!password) password = ''
		return password == confirmPassword?.value
	}

	const resetPassword = async () => {
		message = ''
		submitted = false
		passwordMismatch = false
		const form = document.getElementById('reset') as HTMLFormElement

		if (!passwordMatch()) {
			passwordMismatch = true
			return
		}

		if (form.checkValidity()) {
			const url = `/auth/reset`
			const res = await fetch(url, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token: data.token,
					password
				})
			})

			if (res.ok) {
				$toast = {
					title: 'Password Reset Succesful',
					body: 'Your password was reset. Please login.',
					isOpen: true
				}

				goto('/login')
			} else {
				const body = await res.json()
				console.log('Failed reset', body)
				message = body.message
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
	id="reset"
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:mt-20 tw:max-w-sm tw:space-y-4"
	class:submitted
>
	<h4><strong>New Password</strong></h4>
	<p>Please provide a new password.</p>

	<label class="tw:block tw:text-sm tw:font-medium" for="password">
		Password
		<input
			class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
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
		<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Password with 8 chars or more required</span>
		<span class="tw:text-xs tw:text-gray-500">
			Minimum 8 characters, one capital letter, one number, one special character.
		</span>
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="passwordConfirm">
		Password (retype)
		<input
			class="tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500"
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
			<span class="tw:text-xs tw:text-red-600 tw:mt-0.5">Passwords must match</span>
		{/if}
	</label>

	{#if message}
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<button
		onclick={resetPassword}
		type="button"
		class="tw:w-full tw:rounded tw:bg-blue-600 tw:px-4 tw:py-2 tw:font-semibold tw:text-white hover:tw:bg-blue-700"
	>
		Reset Password
	</button>
</form>

