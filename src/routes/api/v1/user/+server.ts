import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { query } from '$lib/server/db'

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
