import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '$env/static/private'
import { query } from '$lib/server/db'
import { sendVerificationEmail } from '$lib/server/email'

export const POST: RequestHandler = async event => {
	let body: { email?: string; password?: string; firstName?: string; lastName?: string }
	try {
		body = await event.request.json()
	} catch {
		error(400, 'Invalid request body.')
	}

	if (!body.email || !body.password || !body.firstName || !body.lastName)
		error(400, 'Please supply all required fields: email, password, first and last name.')

	const passwordPattern = /(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/
	if (!passwordPattern.test(body.password))
		error(400, 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.')

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

	// The DB auto-creates a session, but the user must verify email before logging in. Clean it up.
	try {
		await query(`CALL delete_session($1);`, [authenticationResult.sessionId])
	} catch (err) {
		console.error('Failed to delete pre-verification session:', err)
	}

	const token = jwt.sign(
		{ subject: authenticationResult.user.id, purpose: 'verify-email' },
		JWT_SECRET as jwt.Secret,
		{ expiresIn: '24h' }
	)

	await sendVerificationEmail(body.email, token)

	return json({
		message: 'Registration successful. Please check your email to verify your account.',
		emailVerification: true
	})
}
