<script lang="ts">
	import { onMount } from 'svelte'
	import type { LayoutServerData } from './$types'
	import { goto, beforeNavigate } from '$app/navigation'
	import { loginSession, toast } from '../stores'
	import { initializeGoogleAccounts } from '$lib/google'

	import 'bootstrap/scss/bootstrap.scss' // preferred way to load Bootstrap SCSS for hot module reloading

	export let data: LayoutServerData

	// If returning from different website, runs once (as it's an SPA) to restore user session if session cookie is still valid
	const { user } = data
	$loginSession = user

	let Toast: any

	beforeNavigate(() => {
		let expirationDate = $loginSession?.expires ? new Date($loginSession.expires) : undefined

		if (expirationDate && expirationDate < new Date()) {
			console.log('Login session expired.')
			$loginSession = null
		}
	})

	onMount(async () => {
		initializeGoogleAccounts()

		await import('bootstrap/js/dist/collapse') // lots of ways to load Bootstrap but prefer this approach to avoid SSR issues
		await import('bootstrap/js/dist/dropdown')
		Toast = (await import('bootstrap/js/dist/toast')).default

		if (!$loginSession) google.accounts.id.prompt()
	})

	async function logout() {
		// Request server delete httpOnly cookie called loginSession
		const url = '/auth/logout'
		const res = await fetch(url, {
			method: 'POST'
		})
		if (res.ok) {
			loginSession.set(undefined) // delete loginSession.user from
			goto('/login')
		} else console.error(`Logout not successful: ${res.statusText} (${res.status})`)
	}

	const openToast = (open: boolean) => {
		if (open) {
			const toastDiv = <HTMLDivElement>document.getElementById('authToast')
			const t = new Toast(toastDiv)
			t.show()
		}
	}

	$: openToast($toast.isOpen)
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
	<div class="container">
		<a class="navbar-brand" href="/">SvelteKit-Auth-Example</a>
		<button
			class="navbar-toggler"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#navbarMain"
			aria-controls="navbarMain"
			aria-expanded="false"
			aria-label="Toggle navigation"
		>
			<span class="navbar-toggler-icon"></span>
		</button>
		<div class="collapse navbar-collapse" id="navbarMain">
			<ul class="navbar-nav me-5">
				<li class="nav-item"><a class="nav-link active" aria-current="page" href="/">Home</a></li>
				<li class="nav-item"><a class="nav-link" href="/info">Info</a></li>

				{#if $loginSession}
					{#if $loginSession.role == 'admin'}
						<li class="nav-item"><a class="nav-link" href="/admin">Admin</a></li>
					{/if}
					{#if $loginSession.role != 'student'}
						<li class="nav-item"><a class="nav-link" href="/teachers">Teachers</a></li>
					{/if}
				{/if}
			</ul>
			<ul class="navbar-nav">
				{#if $loginSession}
					<li class="nav-item dropdown">
						<a
							class="nav-link dropdown-toggle"
							href={'#'}
							role="button"
							data-bs-toggle="dropdown"
							aria-expanded="false"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								fill="currentColor"
								class="avatar"
								viewBox="0 0 16 16"
							>
								<path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
								<path
									fill-rule="evenodd"
									d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
								/>
							</svg>
							{$loginSession.firstName}
						</a>
						<ul class="dropdown-menu">
							<li>
								<a class="dropdown-item" href="/profile">Profile</a>
							</li>
							<li>
								<a
									on:click|preventDefault={logout}
									class="dropdown-item"
									class:d-none={!$loginSession || $loginSession.id === 0}
									href={'#'}>Logout</a
								>
							</li>
						</ul>
					</li>
				{:else}
					<li class="nav-item">
						<a class="nav-link" href="/login">Login</a>
					</li>
				{/if}
			</ul>
		</div>
	</div>
</nav>

<main class="container">
	<slot />

	<div
		id="authToast"
		class="toast position-fixed top-0 end-0 m-3"
		role="alert"
		aria-live="assertive"
		aria-atomic="true"
	>
		<div class="toast-header bg-primary text-white">
			<strong class="me-auto">{$toast.title}</strong>
			<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
		</div>
		<div class="toast-body">
			{$toast.body}
		</div>
	</div>
</main>

<style lang="scss" global>
	// Make Retina displays crisper
	* {
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.toast {
		z-index: 9999;
	}

	.avatar {
		position: relative;
		top: -1.5px;
	}
</style>
