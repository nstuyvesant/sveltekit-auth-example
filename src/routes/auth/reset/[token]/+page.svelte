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

	onMount(() => {
		focusedField?.focus()
	})

	const passwordMatch = () => {
		if (!password) password = ''
		return password == confirmPassword?.value
	}

	const resetPassword = async () => {
		message = ''
		const form = document.getElementById('reset') as HTMLFormElement

		if (!passwordMatch()) {
			confirmPassword?.classList.add('is-invalid')
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
			form.classList.add('was-validated')
			focusOnFirstError(form)
		}
	}
</script>

<svelte:head>
	<title>New Password</title>
</svelte:head>

<div class="d-flex justify-content-center mt-5">
	<div class="card login">
		<div class="card-body">
			<form id="reset" autocomplete="on" novalidate>
				<h4><strong>New Password</strong></h4>
				<p>Please provide a new password.</p>
				<div class="mb-3">
					<label class="form-label" for="password">Password</label>
					<input
						class="form-control"
						id="password"
						type="password"
						bind:value={password}
						bind:this={focusedField}
						minlength="8"
						maxlength="80"
						placeholder="Password"
						autocomplete="new-password"
					/>
					<div class="invalid-feedback">Password with 8 chars or more required</div>
					<div class="form-text">
						Password minimum length 8, must have one capital letter, 1 number, and one unique
						character.
					</div>
				</div>
				<div class="mb-3">
					<label class="form-label" for="passwordConfirm">Password (retype)</label>
					<input
						class="form-control"
						id="passwordConfirm"
						type="password"
						required={!!password}
						bind:this={confirmPassword}
						minlength="8"
						maxlength="80"
						placeholder="Password (again)"
						autocomplete="new-password"
					/>
					<div class="invalid-feedback">Passwords must match</div>
				</div>

				{#if message}
					<p class="text-danger">{message}</p>
				{/if}
				<div class="d-grid gap-2">
					<button onclick={resetPassword} type="button" class="btn btn-primary btn-lg"
						>Send Email</button
					>
				</div>
			</form>
		</div>
	</div>
</div>

<style>
	.card-body {
		width: 25rem;
	}
</style>
