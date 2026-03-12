import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { query } from '$lib/server/db'

/**
 * Updates the authenticated user's profile.
 *
 * Reads a partial user object from the JSON request body and passes it to the
 * `update_user` stored procedure.
 *
 * @returns `{ message }` JSON on success.
 * @throws 401 if the user is not logged in.
 * @throws 503 if the database call fails.
 */
export const PUT: RequestHandler = async event => {
	const { user } = event.locals

	if (!user) error(401, 'Unauthorized - must be logged-in.')

	try {
		const userUpdate = await event.request.json()
		await query(`CALL update_user($1, $2);`, [user.id, JSON.stringify(userUpdate)])
	} catch (err) {
		error(503, 'Could not communicate with database.')
	}

	return json({
		message: 'Successfully updated user profile.'
	})
}

/**
 * Deletes the authenticated user's account and clears their session cookie.
 *
 * Calls the `delete_user` stored procedure, which cascades to related session
 * records via `ON DELETE CASCADE`, then removes the `session` cookie.
 *
 * @returns `{ message }` JSON on success.
 * @throws 401 if the user is not logged in.
 * @throws 503 if the database call fails.
 */
export const DELETE: RequestHandler = async event => {
	const { user } = event.locals

	if (!user) error(401, 'Unauthorized')

	try {
		// Deleting the user cascades to sessions via ON DELETE CASCADE
		await query(`CALL delete_user($1);`, [user.id])
	} catch {
		error(503, 'Could not communicate with database.')
	}

	event.cookies.delete('session', { path: '/' })
	return json({ message: 'Account successfully deleted.' })
}
