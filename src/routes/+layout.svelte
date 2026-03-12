<script lang="ts">
	import { onMount } from 'svelte'
	import type { LayoutServerData } from './$types'
	import { goto, beforeNavigate } from '$app/navigation'
	import { appState } from '$lib/app-state.svelte'
	import { initializeGoogleAccounts } from '$lib/google'
	import { setupFetchInterceptor } from '$lib/fetch-interceptor'

	import './layout.css'

	interface Props {
		data: LayoutServerData
		children?: import('svelte').Snippet
	}

	let { data, children }: Props = $props()

	$effect(() => {
		appState.user = data.user
	})

	let navOpen = $state(false)
	let dropdownOpen = $state(false)
	let dropdownEl: HTMLDivElement | undefined = $state()

	function handleWindowClick(e: MouseEvent) {
		if (dropdownOpen && dropdownEl && !dropdownEl.contains(e.target as Node)) {
			dropdownOpen = false
		}
	}

	beforeNavigate(() => {
		navOpen = false
		dropdownOpen = false
		const expirationDate = appState.user?.expires ? new Date(appState.user.expires) : undefined
		if (expirationDate && expirationDate < new Date()) {
			console.log('Login session expired.')
			appState.user = undefined
		}
	})

	onMount(() => {
		setupFetchInterceptor()
		initializeGoogleAccounts()
		if (!appState.user) google.accounts.id.prompt()
	})

	async function logout(event: MouseEvent) {
		event.preventDefault()
		const res = await fetch('/auth/logout', { method: 'POST' })
		if (res.ok) {
			appState.user = undefined
			goto('/login')
		} else console.error(`Logout not successful: ${res.statusText} (${res.status})`)
	}
</script>

<svelte:window onclick={handleWindowClick} />

<nav class="tw:bg-gray-100 tw:border-b tw:border-gray-200 tw:dark:bg-gray-900 tw:dark:border-gray-700">
	<div class="tw:mx-auto tw:max-w-5xl tw:px-4 tw:flex tw:items-center tw:justify-between tw:h-14">
		<a class="tw:font-semibold tw:text-gray-800 tw:no-underline tw:dark:text-gray-100" href="/">SvelteKit-Auth-Example</a>

		<!-- Mobile toggle -->
		<button
			class="tw:sm:hidden tw:p-2 tw:rounded tw:text-gray-600 hover:tw:bg-gray-200 tw:dark:text-gray-300 tw:dark:hover:bg-gray-700"
			aria-label="Toggle navigation"
			onclick={() => (navOpen = !navOpen)}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="tw:h-5 tw:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>

		<!-- Nav links -->
		<div class="tw:hidden tw:sm:flex tw:items-center tw:gap-6 {navOpen ? '!tw:flex tw:flex-col tw:absolute tw:top-14 tw:left-0 tw:right-0 tw:bg-gray-100 tw:dark:bg-gray-900 tw:p-4 tw:border-b tw:border-gray-200 tw:dark:border-gray-700' : ''}">
			<a class="tw:text-sm tw:text-gray-700 tw:no-underline hover:tw:text-gray-900 tw:dark:text-gray-300 tw:dark:hover:text-white" href="/">Home</a>
			<a class="tw:text-sm tw:text-gray-700 tw:no-underline hover:tw:text-gray-900 tw:dark:text-gray-300 tw:dark:hover:text-white" href="/info">Info</a>

			{#if appState.user?.role === 'admin'}
				<a class="tw:text-sm tw:text-gray-700 tw:no-underline hover:tw:text-gray-900 tw:dark:text-gray-300 tw:dark:hover:text-white" href="/admin">Admin</a>
			{/if}
			{#if appState.user && appState.user.role !== 'student'}
				<a class="tw:text-sm tw:text-gray-700 tw:no-underline hover:tw:text-gray-900 tw:dark:text-gray-300 tw:dark:hover:text-white" href="/teachers">Teachers</a>
			{/if}

			{#if appState.user}
				<!-- User dropdown -->
				<div class="tw:relative" bind:this={dropdownEl}>
					<button
						class="tw:flex tw:items-center tw:gap-1 tw:text-sm tw:text-gray-700 hover:tw:text-gray-900 tw:bg-transparent tw:border-0 tw:cursor-pointer tw:dark:text-gray-300 tw:dark:hover:text-white"
						onclick={() => (dropdownOpen = !dropdownOpen)}
						aria-expanded={dropdownOpen}
						aria-haspopup="true"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="tw:relative tw:top-[-1.5px]">
							<path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
							<path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z" />
						</svg>
						{appState.user?.firstName}
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
							<path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
						</svg>
					</button>
					{#if dropdownOpen}
					<ul class="tw:absolute tw:right-0 tw:mt-1 tw:w-36 tw:rounded tw:border tw:border-gray-200 tw:bg-white tw:shadow-md tw:py-1 tw:z-50 tw:list-none tw:dark:bg-gray-800 tw:dark:border-gray-700">
							<li><a class="tw:block tw:px-4 tw:py-2 tw:text-sm tw:text-gray-700 tw:no-underline hover:tw:bg-gray-100 tw:dark:text-gray-300 tw:dark:hover:bg-gray-700" href="/profile">Profile</a></li>
							{#if appState.user?.id !== 0}
							<li>
								<button
									onclick={logout}
									class="tw:block tw:w-full tw:text-left tw:px-4 tw:py-2 tw:text-sm tw:text-gray-700 tw:bg-transparent tw:border-0 tw:cursor-pointer hover:tw:bg-gray-100 tw:dark:text-gray-300 tw:dark:hover:bg-gray-700"
								>Logout</button>
							</li>
							{/if}
						</ul>
					{/if}
				</div>
			{:else}
				<a class="tw:text-sm tw:text-gray-700 tw:no-underline hover:tw:text-gray-900 tw:dark:text-gray-300 tw:dark:hover:text-white" href="/login">Login</a>
			{/if}
		</div>
	</div>
</nav>

<main class="tw:mx-auto tw:max-w-5xl tw:px-4 tw:py-6">
	{@render children?.()}
</main>

<!-- Toast notification -->
{#if appState.toast.isOpen}
	<div
		role="alert"
		aria-live="assertive"
		aria-atomic="true"
		class="tw:fixed tw:top-4 tw:right-4 tw:z-50 tw:min-w-64 tw:rounded tw:shadow-lg tw:border tw:border-gray-200 tw:bg-white tw:overflow-hidden tw:dark:bg-gray-800 tw:dark:border-gray-700"
	>
		<div class="tw:flex tw:items-center tw:justify-between tw:bg-blue-600 tw:px-4 tw:py-2">
			<strong class="tw:text-white tw:text-sm">{appState.toast.title}</strong>
			<button
				type="button"
				aria-label="Close"
				class="tw:text-white tw:bg-transparent tw:border-0 tw:cursor-pointer tw:text-lg tw:leading-none"
				onclick={() => (appState.toast = { ...appState.toast, isOpen: false })}>&times;</button>
		</div>
		<div class="tw:px-4 tw:py-3 tw:text-sm tw:dark:text-gray-100">{appState.toast.body}</div>
	</div>
{/if}
