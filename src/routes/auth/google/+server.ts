import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { OAuth2Client } from 'google-auth-library'
import { query } from '$lib/server/db'
import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public'

/**
 * Verifies a Google ID token and extracts basic user info from its payload.
 *
 * @see https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 * @param token - The Google credential JWT returned by the Identity Services SDK.
 * @returns A partial {@link User} containing `firstName`, `lastName`, and `email`.
 * @throws 500 if the token is invalid or the payload is missing.
 */
async function getGoogleUserFromJWT(token: string): Promise<Partial<User>> {
	try {
		const client = new OAuth2Client(PUBLIC_GOOGLE_CLIENT_ID)
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: PUBLIC_GOOGLE_CLIENT_ID
		})
		const payload = ticket.getPayload()
		if (!payload) error(500, 'Google authentication did not get the expected payload')

		return {
			firstName: payload['given_name'] || 'UnknownFirstName',
			lastName: payload['family_name'] || 'UnknownLastName',
			email: payload['email']
		}
	} catch (err) {
		let message = ''
		if (err instanceof Error) message = err.message
		error(500, `Google user could not be authenticated: ${message}`)
	}
}

/**
 * Upserts a Google-authenticated user in the database and creates a new session.
 *
 * Calls the `start_gmail_user_session` SQL function, which inserts or updates
 * the user record and returns a {@link UserSession} containing the session ID
 * and user data.
 *
 * @param user - Partial user data obtained from the verified Google ID token.
 * @returns A {@link UserSession} with the new session ID and user record.
 * @throws 500 if the database call fails.
 */
async function upsertGoogleUser(user: Partial<User>): Promise<UserSession> {
	try {
		const sql = `SELECT start_gmail_user_session($1) AS user_session;`
		const { rows } = await query(sql, [JSON.stringify(user)])
		return <UserSession>rows[0].user_session
	} catch (err) {
		let message = ''
		if (err instanceof Error) message = err.message
		error(500, `Gmail user could not be upserted: ${message}`)
	}
}

/**
 * Handles Google Sign-In by verifying the credential token, upserting the user,
 * and issuing a session cookie.
 *
 * Expects a JSON body with a `token` field containing the Google credential JWT.
 * On success, sets an `httpOnly` session cookie and returns the authenticated user.
 *
 * @returns `{ message, user }` JSON on success.
 * @throws 401 if Google authentication fails at any step.
 */
export const POST: RequestHandler = async event => {
	const { cookies } = event

	try {
		const { token } = await event.request.json()
		const user = await getGoogleUserFromJWT(token)
		const userSession = await upsertGoogleUser(user)

		// Prevent hooks.server.ts's handler() from deleting cookie thinking no one has authenticated
		event.locals.user = userSession.user

		cookies.set('session', userSession.id, {
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			path: '/'
		})
		return json({ message: 'Successful Google Sign-In.', user: userSession.user })
	} catch {
		error(401, 'Google authentication failed.')
	}
}
