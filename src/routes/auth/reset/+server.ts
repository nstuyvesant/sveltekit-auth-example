import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '$env/static/private'
import { query } from '$lib/server/db'
import { verifyTurnstileToken } from '$lib/server/turnstile'

/**
 * Resets a user's password using a signed JWT reset token.
 *
 * Expects a JSON body with `token` (the JWT from the reset email) and
 * `password` (the new password). The token must have been signed with
 * `purpose: 'reset-password'`.
 *
 * On success:
 * - Updates the user's password via the `reset_password` stored procedure.
 * - Best-effort invalidation of all existing sessions so the old password
 *   can no longer be used.
 *
 * @returns `{ message }` JSON with HTTP 200 on success, or HTTP 403 if the
 *   token is invalid or expired.
 */
export const PUT: RequestHandler = async event => {
	const body = await event.request.json()
	const { token, password } = body

	const ip = event.request.headers.get('CF-Connecting-IP') ?? event.getClientAddress()
	const turnstileOk = await verifyTurnstileToken(body.turnstileToken ?? '', ip)
	if (!turnstileOk)
		return json({ message: 'Security challenge failed. Please try again.' }, { status: 400 })

	// Check the validity of the token and extract userId
	try {
		const decoded = <JwtPayload>jwt.verify(token, <jwt.Secret>JWT_SECRET)
		if (decoded.purpose !== 'reset-password') throw new Error('Invalid token purpose.')
		const userId = decoded.subject

		// Update the database with the new password
		const sql = `CALL reset_password($1, $2);`
		await query(sql, [userId, password])

		// Invalidate all existing sessions so the old password can no longer be used
		try {
			await query(`CALL delete_session($1);`, [userId])
		} catch (err) {
			console.error('Failed to invalidate sessions after password reset:', err)
		}

		return json({
			message: 'Password successfully reset.'
		})
	} catch (error) {
		// Technically, I should check error.message to make sure it's not a DB issue
		return json(
			{
				message: 'Password reset token expired.'
			},
			{
				status: 403
			}
		)
	}
}
