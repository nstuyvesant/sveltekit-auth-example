<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { loginSession } from '../../stores'
	import { focusOnFirstError } from '$lib/focus'
	import { initializeGoogleAccounts, renderGoogleButton } from '$lib/google'

	let focusedField: HTMLInputElement

	let user: User = {
		id: 0,
		role: 'student',
		firstName: '',
		lastName: '',
		password: '',
		email: '',
		phone: ''
	}
	let confirmPassword: HTMLInputElement
	let message: string

	async function register() {
		const form = <HTMLFormElement>document.getElementById('register')
		message = ''

		if (!passwordMatch()) {
			confirmPassword.classList.add('is-invalid')
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
			form.classList.add('was-validated')
			focusOnFirstError(form)
		}
	}

	onMount(() => {
		initializeGoogleAccounts()
		renderGoogleButton()

		focusedField.focus()
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
		return user.password == confirmPassword.value
	}
</script>

<svelte:head>
	<title>Register</title>
</svelte:head>

<div class="d-flex justify-content-center my-3">
	<div class="card login">
		<div class="card-body">
			<h4><strong>Register</strong></h4>
			<p>Welcome to our community.</p>
			{#if user}
				<form id="register" autocomplete="on" novalidate class="mt-3">
					<div class="mb-3">
						<div id="googleButton"></div>
					</div>
					<div class="mb-3">
						<label class="form-label" for="email">Email</label>
						<input
							bind:this={focusedField}
							type="email"
							class="form-control"
							bind:value={user.email}
							required
							placeholder="Email"
							id="email"
							autocomplete="email"
						/>
						<div class="invalid-feedback">Email address required</div>
					</div>
					<div class="mb-3">
						<label class="form-label" for="password">Password</label>
						<input
							type="password"
							id="password"
							class="form-control"
							bind:value={user.password}
							required
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
						<label class="form-label" for="password">Confirm password</label>
						<input
							type="password"
							id="password"
							class="form-control"
							bind:this={confirmPassword}
							required
							minlength="8"
							maxlength="80"
							placeholder="Password (again)"
							autocomplete="new-password"
						/>
						<div class="form-text">
							Password minimum length 8, must have one capital letter, 1 number, and one unique
							character.
						</div>
					</div>
					<div class="mb-3">
						<label class="form-label" for="firstName">First name</label>
						<input
							bind:value={user.firstName}
							class="form-control"
							id="firstName"
							placeholder="First name"
							required
							autocomplete="given-name"
						/>
						<div class="invalid-feedback">First name required</div>
					</div>
					<div class="mb-3">
						<label class="form-label" for="lastName">Last name</label>
						<input
							bind:value={user.lastName}
							class="form-control"
							id="lastName"
							placeholder="Last name"
							required
							autocomplete="family-name"
						/>
						<div class="invalid-feedback">Last name required</div>
					</div>
					<div class="mb-3">
						<label class="form-label" for="phone">Phone</label>
						<input
							type="tel"
							bind:value={user.phone}
							id="phone"
							class="form-control"
							placeholder="Phone"
							autocomplete="tel-local"
						/>
					</div>

					{#if message}
						<p class="text-danger">{message}</p>
					{/if}

					<button type="button" on:click={register} class="btn btn-primary btn-lg">Register</button>
				</form>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.card-body {
		width: 25rem;
	}
</style>
