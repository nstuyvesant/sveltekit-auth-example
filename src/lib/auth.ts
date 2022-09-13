/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Page } from '@sveltejs/kit'
import type { Readable, Writable } from 'svelte/store'
import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public'

export default function useAuth(
	page: Readable<Page>,
	loginSession: Writable<User>,
	goto: (
		url: string | URL,
		opts?: { replaceState?: boolean; noscroll?: boolean; keepfocus?: boolean; state?: any }
	) => Promise<any>
) {
	let user: User
	loginSession.subscribe((value) => {
		user = value
	})

	let referrer: string | null
	page.subscribe((value) => {
		referrer = value.url.searchParams.get('referrer')
	})

	async function googleCallback(response: GoogleCredentialResponse) {
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
			if (referrer) return goto(referrer)
			if (role === 'teacher') return goto('/teachers')
			if (role === 'admin') return goto('/admin')
			if (location.pathname === '/login') goto('/') // logged in so go home
		}
	}

	function initializeSignInWithGoogle(htmlId?: string) {
		const { id } = window.google.accounts // assumes <script src="https://accounts.google.com/gsi/client" async defer></script> is in app.html
		id.initialize({ client_id: PUBLIC_GOOGLE_CLIENT_ID, callback: googleCallback })

		if (htmlId) {
			// render button instead of prompt
			return id.renderButton(document.getElementById(htmlId), {
				theme: 'filled_blue',
				size: 'large',
				width: '367'
			})
		}

		if (!user) id.prompt()
	}

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

	async function loginLocal(credentials: Credentials) {
		try {
			const res = await fetch('/auth/login', {
				method: 'POST',
				body: JSON.stringify(credentials),
				headers: {
					'Content-Type': 'application/json'
				}
			})
			const fromEndpoint = await res.json()
			if (res.ok) {
				loginSession.set(fromEndpoint.user)
				const { role } = fromEndpoint.user
				if (referrer) return goto(referrer)
				if (role === 'teacher') return goto('/teachers')
				if (role === 'admin') return goto('/admin')
				return goto('/')
			} else {
				throw new Error(fromEndpoint.message)
			}
		} catch (err) {
			if (err instanceof Error) {
				console.error('Login error', err)
				throw new Error(err.message)
			}
		}
	}

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

	return { initializeSignInWithGoogle, registerLocal, loginLocal, logout }
}
