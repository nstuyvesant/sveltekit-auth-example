import { goto } from '$app/navigation'
import { page } from '$app/state'
import { appState } from '$lib/app-state.svelte'

/**
 * Monkey-patches window.fetch to intercept 401 responses.
 * When a 401 is received while a user is logged in, the session has expired:
 * clear app state and redirect to /login with the current path as the referrer.
 *
 * Call once from +layout.svelte's onMount.
 */
export function setupFetchInterceptor() {
	const originalFetch = window.fetch
	window.fetch = async (...args) => {
		const response = await originalFetch(...args)
		if (response.status === 401 && appState.user) {
			appState.user = undefined
			const referrer = encodeURIComponent(page.url.pathname + page.url.search)
			goto(`/login?referrer=${referrer}`)
		}
		return response
	}
}
