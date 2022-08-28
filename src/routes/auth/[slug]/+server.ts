import { error, json } from '@sveltejs/kit'
import type { Action } from './$types'
import { query } from '../../_db'

export const POST: Action = async (event) => {
	const { slug } = event.params

	let result
	let sql

	try {
		switch (slug) {
			case 'logout':
				if (event.locals.user) {
					// if user is null, they are logged out anyway (session might have ended)
					sql = `CALL delete_session($1);`
					result = await query(sql, [event.locals.user.id])
				}
				return new Response(JSON.stringify({ message: 'Logout successful.' }), {
					headers: {
						'Set-Cookie': `session=; Path=/; SameSite=Lax; HttpOnly; Expires=${new Date().toUTCString()}`
					}
				})
			case 'login':
				sql = `SELECT authenticate($1) AS "authenticationResult";`
				break
			case 'register':
				sql = `SELECT register($1) AS "authenticationResult";`
				break
			default:
				throw error(404, 'Invalid endpoint.')
		}

		// Only /auth/login and /auth/register at this point
		const body = await event.request.json()

		// While client checks for these to be non-null, register() in the database does not
		if (slug == 'register' && (!body.email || !body.password || !body.firstName || !body.lastName))
			throw error(400, 'Please supply all required fields: email, password, first and last name.')

		result = await query(sql, [JSON.stringify(body)])
	} catch (err) {
		throw error(503, 'Could not communicate with database.')
	}

	const { authenticationResult }: { authenticationResult: AuthenticationResult } = result.rows[0]

	if (!authenticationResult.user)
		// includes when a user tries to register an existing email account with wrong password
		throw error(authenticationResult.statusCode, authenticationResult.status)

	// Ensures hooks.ts:handle() will not delete cookie just set
	event.locals.user = authenticationResult.user

	return json(
		{
			message: authenticationResult.status,
			user: authenticationResult.user
		},
		{
			headers: {
				'Set-Cookie': `session=${authenticationResult.sessionId}; Path=/; SameSite=Lax; HttpOnly;`
			}
		}
	)
}
