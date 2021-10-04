import type { RequestHandler } from '@sveltejs/kit'
import { OAuth2Client } from 'google-auth-library'
import { query } from '../_db';
import { config } from '$lib/config'

// Verify JWT per https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
async function getGoogleUserFromJWT(token: string): Promise<User> {
  try {
    const clientId = config.googleClientId
    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId
    });
    const payload = ticket.getPayload()
    return {
      firstName: payload['given_name'],
      lastName: payload['family_name'],
      email: payload['email']
    }
  } catch (error) {
    throw new Error(`Google user could not be authenticated: ${error.message}`)
  }
}

// Upsert user and get session ID
async function upsertGoogleUser(user: User): Promise<UserSession> {
  try {
    const sql = `SELECT start_gmail_user_session($1) AS user_session;`
    const { rows } = await query(sql, [JSON.stringify(user)])
    return <UserSession> rows[0].user_session
  } catch (error) {
    throw new Error(`GMail user could not be upserted: ${error.message}`)
  }
}

// Returns local user if Google user authenticated (and authorized our app)
type UserLocal = { user: User }
type BodyToken = { token: string }
export const post: RequestHandler<UserLocal, Required<BodyToken>> = async (request) => {
  try {
    const user = await getGoogleUserFromJWT(request.body.token)
    const userSession = await upsertGoogleUser(user)

    // Prevent hooks.ts's handler() from deleting cookie thinking no one has authenticated
    request.locals.user = userSession.user

    return {
      status: 200,
      headers: { // database expires sessions in 2 hours
        'Set-Cookie': `session=${userSession.id}; Path=/; SameSite=Lax; HttpOnly;`
      },
      body: {
        message: 'Successful Google Sign-In.',
        user: userSession.user
      }
    }
  } catch (error) {
    return { // session cookie deleted by hooks.js handle()
      status: 401,
      body: {
        message: error.message
      }
    }
  }
}