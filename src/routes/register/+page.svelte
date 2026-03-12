<script lang="ts">
	import { onMount } from 'svelte'
	import { focusOnFirstError } from '$lib/focus'
	import { initializeGoogleAccounts, renderGoogleButton } from '$lib/google'

	let focusedField: HTMLInputElement | undefined = $state()
	// Pattern stored as a variable to avoid Svelte parsing `{8,}` as a template expression
	const passwordPattern = '(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}'

	let user: User = $state({
		id: 0,
		role: 'student',
		firstName: '',
		lastName: '',
		password: '',
		email: '',
		phone: ''
	})
	let confirmPassword: HTMLInputElement | undefined = $state()
	let message = $state('')
	let submitted = $state(false)
	let passwordMismatch = $state(false)
	let loading = $state(false)
	let emailVerificationSent = $state(false)

	let formEl: HTMLFormElement | undefined = $state()

	async function register() {
		const form = formEl!
		message = ''
		submitted = false
		passwordMismatch = false

		if (!passwordMatch()) {
			passwordMismatch = true
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
			submitted = true
			focusOnFirstError(form)
		}
	}

	onMount(() => {
		initializeGoogleAccounts()
		renderGoogleButton()
		focusedField?.focus()
	})

	async function registerLocal(user: User) {
		loading = true
		try {
			const res = await fetch('/auth/register', {
				method: 'POST',
				body: JSON.stringify(user), // server ignores user.role - always set it to 'student' (lowest priv)
				headers: {
					'Content-Type': 'application/json'
				}
			})
			const fromEndpoint = await res.json()
			if (!res.ok) {
				if (res.status == 409)
					throw new Error('Sorry, that email address is already in use.')
				throw new Error(fromEndpoint.message || res.statusText)
			}
			if (fromEndpoint.emailVerification) {
				emailVerificationSent = true
				return
			}
		} catch (err) {
			console.error('Register error', err)
			if (err instanceof Error) {
				throw new Error(err.message)
			}
		} finally {
			loading = false
		}
	}

	const passwordMatch = () => {
		if (!user) return false // placate TypeScript
		if (!user.password) user.password = ''
		return user.password == confirmPassword?.value
	}
</script>

<svelte:head>
	<title>Register</title>
</svelte:head>

{#if emailVerificationSent}
	<div class="tw:mx-auto tw:mt-20 tw:max-w-sm tw:space-y-4">
		<h4>Check your email</h4>
		<p>We've sent a verification link to your email address. Please check your inbox (and junk folder) to complete your registration.</p>
		<a href="/login" class="btn-primary tw:block tw:text-center tw:no-underline">Back to login</a>
	</div>
{:else}
<form
	bind:this={formEl}
	autocomplete="on"
	novalidate
	class="tw:mx-auto tw:my-8 tw:max-w-sm tw:space-y-4"
	class:submitted
	onsubmit={(e) => { e.preventDefault(); register() }}
>
	<h4>Register</h4>
		<p>Welcome to our community.</p>

		<div class="tw:relative tw:w-full">
			<!-- Real Google button: invisible but receives clicks -->
			<div id="googleButton" class="tw:opacity-0 tw:w-full"></div>
			<!-- Visual overlay: looks good, no pointer events -->
			<div class="tw:pointer-events-none tw:absolute tw:inset-0 tw:flex tw:items-center tw:justify-center tw:gap-3 tw:rounded tw:border tw:border-gray-300 tw:bg-white tw:text-sm tw:font-medium tw:text-gray-700 tw:dark:bg-gray-800 tw:dark:border-gray-600 tw:dark:text-gray-200">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
					<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
					<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
					<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
				</svg>
				Sign in with Google
			</div>
		</div>

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
			required
			minlength="8"
			maxlength="80"
			pattern={passwordPattern}
			placeholder="Password"
			autocomplete="new-password"
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
			required
			minlength="8"
			maxlength="80"
			placeholder="Password (again)"
			autocomplete="new-password"
		/>
		{#if passwordMismatch}
			<span class="tw:text-xs tw:text-red-600 tw:mt-0.5">Passwords must match</span>
		{/if}
	</label>

	<label class="tw:block tw:text-sm tw:font-medium" for="firstName">
		First name
		<input
			bind:value={user.firstName}
			class="form-input-validated"
			id="firstName"
			placeholder="First name"
			required
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
			placeholder="Last name"
			required
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
		<p class="tw:text-red-600">{message}</p>
	{/if}

	<button
		type="submit"
		class="btn-primary"
		disabled={loading}
	>
		{loading ? 'Creating account...' : 'Register'}
	</button>
</form>
{/if}
