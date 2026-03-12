import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { query } from '$lib/server/db'

/**
 * Logs the current user out by deleting their server-side session and clearing
 * the session cookie.
 *
 * If no user is authenticated the session cookie is still cleared. Database
 * errors are logged but do not prevent the cookie from being removed (best-effort
 * cleanup).
 *
 * @returns `{ message }` JSON confirming the logout.
 */
export const POST: RequestHandler = async event => {
	const { cookies } = event

	if (event.locals.user) {
		try {
			await query(`CALL delete_session($1);`, [event.locals.user.id])
		} catch (err) {
			console.error('Failed to delete session from database:', err)
			// Best effort — still clear the cookie below
		}
	}

	cookies.delete('session', { path: '/' })
	return json({ message: 'Logout successful.' })
}
