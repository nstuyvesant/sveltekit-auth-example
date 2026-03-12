import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { Secret } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { env } from '$env/dynamic/private'
import { query } from '$lib/server/db'
import { sendMfaCodeEmail } from '$lib/server/email'
import { verifyTurnstileToken } from '$lib/server/turnstile'

/**
 * In-memory failed-attempt tracker used for per-email account lockout.
 * @remarks For production use a shared store such as Redis.
 */
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

/** Maximum consecutive failures before an account is temporarily locked. */
const MAX_FAILURES = 5
/** Duration (ms) an account remains locked after exceeding {@link MAX_FAILURES}. */
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes
/** Name of the cookie used to mark a device as MFA-trusted. */
const MFA_TRUSTED_COOKIE = 'mfa_trusted'

/**
 * Authenticates a user with email and password.
 *
 * - Enforces per-email brute-force lockout ({@link MAX_FAILURES} failures locks
 *   the account for {@link LOCKOUT_MS} ms).
 * - On successful credentials, checks for a valid `mfa_trusted` cookie. If
 *   present and verified, the login is completed immediately and a session
 *   cookie is issued.
 * - Otherwise the pre-created session is deleted, an MFA code is generated and
 *   emailed, and `{ mfaRequired: true }` is returned so the client can prompt
 *   for the code.
 *
 * @returns `{ message, user }` on full login success, or `{ mfaRequired: true }`
 *   when an MFA code has been sent.
 * @throws 400 if the request body is not valid JSON.
 * @throws 429 if the account is temporarily locked.
 * @throws 503 if the database is unreachable.
 * @throws The status code from the authentication result on credential failure.
 */
export const POST: RequestHandler = async event => {
	const { cookies } = event

	let body: { email?: string; password?: string; turnstileToken?: string }
	try {
		body = await event.request.json()
	} catch {
		error(400, 'Invalid request body.')
	}

	const ip = event.request.headers.get('CF-Connecting-IP') ?? event.getClientAddress()
	const turnstileOk = await verifyTurnstileToken(body.turnstileToken ?? '', ip)
	if (!turnstileOk) error(400, 'Security challenge failed. Please try again.')

	const email = body.email?.toLowerCase() ?? ''

	// Check per-email account lockout
	const attempts = failedAttempts.get(email)
	if (attempts && Date.now() < attempts.lockedUntil) {
		error(429, 'Account temporarily locked due to too many failed attempts. Try again later.')
	}

	let result
	try {
		const sql = `SELECT authenticate($1) AS "authenticationResult";`
		result = await query(sql, [JSON.stringify(body)])
	} catch {
		error(503, 'Could not communicate with database.')
	}

	const { authenticationResult } = result.rows[0] as { authenticationResult: AuthenticationResult }

	if (!authenticationResult.user) {
		// Track failed attempt for lockout
		if (email) {
			const existing = failedAttempts.get(email)
			if (existing) {
				existing.count++
				if (existing.count >= MAX_FAILURES) {
					existing.lockedUntil = Date.now() + LOCKOUT_MS
					existing.count = 0
				}
			} else {
				failedAttempts.set(email, { count: 1, lockedUntil: 0 })
			}
		}
		error(authenticationResult.statusCode, authenticationResult.status)
	}

	// Clear lockout tracker on successful login
	failedAttempts.delete(email)

	const userId = authenticationResult.user.id!

	// Check if this device is already MFA-trusted for this user
	const trustedToken = cookies.get(MFA_TRUSTED_COOKIE)
	if (trustedToken) {
		try {
			const payload = jwt.verify(trustedToken, env.JWT_SECRET as Secret) as {
				userId: number
				purpose: string
			}
			if (payload.purpose === 'mfa-trusted' && payload.userId === userId) {
				// Trusted device — skip MFA and complete login
				event.locals.user = authenticationResult.user
				cookies.set('session', authenticationResult.sessionId, {
					httpOnly: true,
					sameSite: 'lax',
					secure: true,
					path: '/'
				})
				return json({ message: authenticationResult.status, user: authenticationResult.user })
			}
		} catch {
			// Invalid or expired trusted token — fall through to MFA
			cookies.delete(MFA_TRUSTED_COOKIE, { path: '/' })
		}
	}

	// MFA required — delete the pre-created session until code is verified
	await query(`CALL delete_session($1);`, [userId])

	// Generate and email the MFA code
	const codeResult = await query(`SELECT create_mfa_code($1) AS code;`, [userId])
	const code: string = codeResult.rows[0].code
	await sendMfaCodeEmail(email, code)

	return json({ mfaRequired: true })
}
