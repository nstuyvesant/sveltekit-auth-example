import { page } from '$app/state'
import { goto } from '$app/navigation'
import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public'
import { appState } from '$lib/app-state.svelte'

export function renderGoogleButton() {
	const btn = document.getElementById('googleButton')
	if (btn) {
		google.accounts.id.renderButton(btn, {
			type: 'standard',
			theme: 'filled_blue',
			size: 'large',
			width: btn.offsetWidth || 400
		})
	}
}

export function initializeGoogleAccounts() {
	if (!appState.googleInitialized) {
		google.accounts.id.initialize({
			client_id: PUBLIC_GOOGLE_CLIENT_ID,
			callback: googleCallback
		})
		appState.googleInitialized = true
	}

	async function googleCallback(response: google.accounts.id.CredentialResponse) {
		const res = await fetch('/auth/google', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ token: response.credential })
		})

		if (res.ok) {
			const fromEndpoint = await res.json()
			appState.user = fromEndpoint.user
			const { role } = fromEndpoint.user

			const referrer = page.url.searchParams.get('referrer')

			if (referrer) return goto(referrer)
			if (role === 'teacher') return goto('/teachers')
			if (role === 'admin') return goto('/admin')
			if (location.pathname === '/login') goto('/') // logged in so go home
		}
	}
}
