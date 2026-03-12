import { goto } from '$app/navigation'
import { page } from '$app/state'

/**
 * Redirect the user to the appropriate page after a successful login,
 * respecting an optional ?referrer= query parameter.
 */
export function redirectAfterLogin(user: User): void {
	if (!user) return
	const referrer = page.url.searchParams.get('referrer')
	if (referrer && referrer.startsWith('/') && !referrer.startsWith('//')) {
		goto(referrer)
		return
	}
	switch (user.role) {
		case 'teacher':
			goto('/teachers')
			break
		case 'admin':
			goto('/admin')
			break
		default:
			goto('/')
	}
}
