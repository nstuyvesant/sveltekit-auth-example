import type { Secret } from 'jsonwebtoken'
import type { RequestHandler } from './$types'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '$env/static/private'
import { query } from '$lib/server/db'
import { sendPasswordResetEmail } from '$lib/server/email'
import { error } from '@sveltejs/kit'
import { verifyTurnstileToken } from '$lib/server/turnstile'

/**
 * Handles a forgot-password request.
 *
 * Looks up the provided email address. If a matching user is found, a signed
 * JWT (valid for 30 minutes) is generated and sent via a password-reset email.
 * A 204 is always returned regardless of whether the email exists, to prevent
 * user enumeration.
 *
 * @returns 204 No Content in all cases.
 */
export const POST: RequestHandler = async event => {
	const body = await event.request.json()

	const ip = event.request.headers.get('CF-Connecting-IP') ?? event.getClientAddress()
	const turnstileOk = await verifyTurnstileToken(body.turnstileToken ?? '', ip)
	if (!turnstileOk) error(400, 'Security challenge failed. Please try again.')

	const sql = `SELECT id as "userId" FROM users WHERE email = $1 LIMIT 1;`
	const { rows } = await query(sql, [body.email])

	if (rows.length > 0) {
		const token = jwt.sign(
			{ subject: rows[0].userId, purpose: 'reset-password' },
			JWT_SECRET as Secret,
			{ expiresIn: '30m' }
		)
		try {
			await sendPasswordResetEmail(body.email, token)
		} catch (err) {
			console.error('Failed to send password reset email:', err)
			// Still return 204 to avoid leaking whether the email exists in our system
		}
	}

	return new Response(undefined, { status: 204 })
}
