import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { query } from '$lib/server/db'

export const POST: RequestHandler = async event => {
	const { cookies } = event

	let body: { email?: string; password?: string; firstName?: string; lastName?: string }
	try {
		body = await event.request.json()
	} catch {
		error(400, 'Invalid request body.')
	}

	if (!body.email || !body.password || !body.firstName || !body.lastName)
		error(400, 'Please supply all required fields: email, password, first and last name.')

	let result
	try {
		const sql = `SELECT register($1) AS "authenticationResult";`
		result = await query(sql, [JSON.stringify(body)])
	} catch {
		error(503, 'Could not communicate with database.')
	}

	const { authenticationResult }: { authenticationResult: AuthenticationResult } = result.rows[0]

	if (!authenticationResult.user)
		error(authenticationResult.statusCode, authenticationResult.status)

	event.locals.user = authenticationResult.user
	cookies.set('session', authenticationResult.sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		path: '/'
	})
	return json({ message: authenticationResult.status, user: authenticationResult.user })
}
