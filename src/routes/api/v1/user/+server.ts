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
