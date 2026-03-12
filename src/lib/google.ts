import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public'
import { appState } from '$lib/app-state.svelte'
import { redirectAfterLogin } from '$lib/auth-redirect'

/**
 * Renders the Google Sign-In button inside the element with id `googleButton`.
 *
 * Reads the element's width (falling back to its parent's width, then 400px)
 * and passes it to the Google Identity Services SDK so the button scales
 * correctly within its container.
 */
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

/**
 * Initializes the Google Identity Services SDK (once per session) and
 * registers a callback that handles the credential response after the user
 * signs in with Google.
 *
 * On a successful sign-in the callback:
 * 1. POSTs the Google credential token to `/auth/google`.
 * 2. Updates {@link appState.user} with the returned user.
 * 3. Redirects the user via {@link redirectAfterLogin}.
 */
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
