import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '$env/static/private'
import { query } from '$lib/server/db'

// Handles email verification links sent after registration
export const GET: RequestHandler = async event => {
	const { token } = event.params
	const { cookies } = event

	// Verify the JWT — extract userId only if token is valid and correct purpose
	let userId: string | undefined
	try {
		const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload
		if (decoded.purpose === 'verify-email' && decoded.subject) {
			userId = decoded.subject
		}
	} catch {
		// Expired or tampered token — fall through to redirect below
	}

	if (!userId) redirect(302, '/login?error=invalid-token')

	// Mark email as verified and create a session atomically
	let sessionId: string | undefined
	try {
		const { rows } = await query<{ verify_email_and_create_session: string }>(
			`SELECT verify_email_and_create_session($1)`,
			[userId]
		)
		sessionId = rows[0]?.verify_email_and_create_session
	} catch (err) {
		console.error('Email verification DB error:', err)
	}

	if (!sessionId) redirect(302, '/login?error=verification-failed')

	cookies.set('session', sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		path: '/'
	})

	redirect(302, '/')
}
