import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { query } from '$lib/server/db'

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
