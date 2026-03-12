import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public'
import { appState } from '$lib/app-state.svelte'
import { redirectAfterLogin } from '$lib/auth-redirect'

export function renderGoogleButton() {
	const btn = document.getElementById('googleButton')
	if (btn) {
		const width = btn.offsetWidth || btn.parentElement?.offsetWidth || 400
		google.accounts.id.renderButton(btn, {
			type: 'standard',
			theme: 'outline',
			size: 'large',
			width: Math.floor(width)
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
			redirectAfterLogin(fromEndpoint.user)
		}
	}
}
