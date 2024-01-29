import { page } from '$app/stores'
import { goto } from '$app/navigation'
import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public'
import { googleInitialized, loginSession } from '../stores'

export function renderGoogleButton() {
	const btn = document.getElementById('googleButton')
	if (btn) {
		google.accounts.id.renderButton(btn, {
			type: 'standard',
			theme: 'filled_blue',
			size: 'large',
			width: 367
		})
	}
}

export function initializeGoogleAccounts() {
	let initialized = false
	const unsubscribe = googleInitialized.subscribe((value) => {
		initialized = value
	})

	if (!initialized) {
		google.accounts.id.initialize({
			client_id: PUBLIC_GOOGLE_CLIENT_ID,
			callback: googleCallback
		})

		googleInitialized.set(true)
	}
	unsubscribe()

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
			loginSession.set(fromEndpoint.user) // update loginSession store
			const { role } = fromEndpoint.user

			let referrer
			const unsubscribe = page.subscribe((p) => {
				referrer = p.url.searchParams.get('referrer')
			})
			unsubscribe()

			if (referrer) return goto(referrer)
			if (role === 'teacher') return goto('/teachers')
			if (role === 'admin') return goto('/admin')
			if (location.pathname === '/login') goto('/') // logged in so go home
		}
	}
}
