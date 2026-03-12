import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { Secret } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '$env/static/private'
import { query } from '$lib/server/db'
import { sendMfaCodeEmail } from '$lib/server/email'

// In-memory failed-attempt tracker for account lockout (per email)
// For production use a shared store like Redis.
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX_FAILURES = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes
const MFA_TRUSTED_COOKIE = 'mfa_trusted'

export const POST: RequestHandler = async event => {
	const { cookies } = event

	let body: { email?: string; password?: string }
	try {
		body = await event.request.json()
	} catch {
		error(400, 'Invalid request body.')
	}

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

	const { authenticationResult }: { authenticationResult: AuthenticationResult } = result.rows[0]

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
			const payload = jwt.verify(trustedToken, JWT_SECRET as Secret) as {
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
