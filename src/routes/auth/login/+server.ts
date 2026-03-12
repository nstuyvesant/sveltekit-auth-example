import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { query } from '$lib/server/db'

// In-memory failed-attempt tracker for account lockout (per email)
// For production use a shared store like Redis.
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX_FAILURES = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

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

	event.locals.user = authenticationResult.user
	cookies.set('session', authenticationResult.sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		path: '/'
	})
	return json({ message: authenticationResult.status, user: authenticationResult.user })
}
