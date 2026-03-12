import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { Secret } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '$env/static/private'
import { query } from '$lib/server/db'

/** Name of the cookie used to mark a device as MFA-trusted. */
const MFA_TRUSTED_COOKIE = 'mfa_trusted'
/** Lifetime of the MFA trusted-device cookie, in seconds (30 days). */
const MFA_TRUSTED_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

/**
 * Verifies an MFA code submitted after a successful password login.
 *
 * - Validates the `email` + `code` pair against the database. The code is
 *   invalidated after use or expiry.
 * - On success, creates a new session and sets an `httpOnly` session cookie.
 * - Also issues a 30-day `mfa_trusted` JWT cookie so that subsequent logins
 *   from the same device skip the MFA step.
 *
 * @returns `{ message, user }` JSON on success.
 * @throws 400 if the request body is invalid or missing required fields.
 * @throws 401 if the verification code is invalid or has expired.
 */
export const POST: RequestHandler = async event => {
	const { cookies } = event

	let body: { email?: string; code?: string }
	try {
		body = await event.request.json()
	} catch {
		error(400, 'Invalid request body.')
	}

	if (!body.email || !body.code) error(400, 'Email and verification code are required.')

	// Verify the code; returns user_id on success, NULL on failure/expiry
	const verifyResult = await query(`SELECT verify_mfa_code($1, $2) AS "userId";`, [
		body.email.toLowerCase(),
		body.code
	])

	const userId: number | null = verifyResult.rows[0]?.userId
	if (!userId) error(401, 'Invalid or expired verification code.')

	// Create a new session now that MFA is verified
	const sessionResult = await query(`SELECT create_session($1) AS "sessionId";`, [userId])
	const sessionId: string = sessionResult.rows[0].sessionId

	// Load the full user object for the response
	const userResult = await query(`SELECT get_session($1::uuid);`, [sessionId])
	const user = userResult.rows[0]?.get_session

	cookies.set('session', sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		path: '/'
	})

	// Issue a 30-day trusted-device cookie so MFA is not required again on this device
	const trustedToken = jwt.sign({ userId, purpose: 'mfa-trusted' }, JWT_SECRET as Secret, {
		expiresIn: '30d'
	})
	cookies.set(MFA_TRUSTED_COOKIE, trustedToken, {
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		path: '/',
		maxAge: MFA_TRUSTED_MAX_AGE
	})

	return json({ message: 'Login successful.', user })
}
