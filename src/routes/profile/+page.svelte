<script lang="ts">
	import type { PageData } from './$types'
	import { onMount } from 'svelte'
	import { focusOnFirstError } from '$lib/focus'
	import { appState } from '$lib/app-state.svelte'

	interface Props {
		data: PageData
	}

	let { data }: Props = $props()
	const { user }: { user: User } = $state(data)

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
>
	<h4><strong>Profile</strong></h4>
	<p>Update your information.</p>

	{#if !user?.email?.includes('gmail.com')}
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
				minlength="8"
				maxlength="80"
				pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}"
				placeholder="Password"
			/>
			<span class="tw:hidden tw:text-xs tw:text-red-600 tw:mt-0.5 tw:[.submitted_&]:peer-invalid:block">Must be 8+ characters with a capital letter, number, and special character</span>
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
			class="tw:peer tw:mt-1 tw:block tw:w-full tw:rounded tw:border tw:border-gray-300 tw:px-3 tw:py-1.5 tw:text-sm focus:tw:outline-none focus:tw:ring-2 focus:tw:ring-blue-500 tw:[.submitted_&]:invalid:border-red-500"
			id="firstName"
			required
			placeholder="First name"
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
			required
			placeholder="Last name"
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
		<p>{message}</p>
	{/if}

	<button
		onclick={update}
		type="button"
		class="tw:w-full tw:rounded tw:bg-blue-600 tw:px-4 tw:py-2 tw:font-semibold tw:text-white hover:tw:bg-blue-700"
	>
		Update
	</button>
</form>
