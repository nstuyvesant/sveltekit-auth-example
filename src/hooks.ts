import * as cookie from 'cookie'
import type { Handle, GetSession } from '@sveltejs/kit'
import { query } from './routes/_db'
import type { ServerRequest, ServerResponse } from '@sveltejs/kit/types/hooks'

// Attach authorization to each server request
// as the user's role may have changed
async function attachUserToRequest(sessionId: string, request: ServerRequest) {
  const sql = `
    SELECT
      json_build_object(
        'id', sessions.user_id,
        'role', users.role,
        'email', users.email,
        'firstName', users.first_name,
        'lastName', users.last_name,
        'phone', users.phone
      ) AS user
    FROM sessions
      INNER JOIN users ON sessions.user_id = users.id
    WHERE sessions.id = $1 AND expires > CURRENT_TIMESTAMP LIMIT 1;`
  const { rows } = await query(sql, [sessionId])
  if (rows?.length > 0) {
    request.locals.user = rows[0].user
  }
}

function deleteCookieIfNoUser(request: ServerRequest, response: ServerResponse) {
  if (!request.locals.user) {
    response.headers['Set-Cookie'] = `session=; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date().toUTCString()}`
  }
}

// Invoked for each endpoint called and initially for SSR router
export const handle: Handle = async ({ request, resolve }) => {

  // before endpoint or page is called
  const cookies = cookie.parse(request.headers.cookie || '')
  if (cookies.session) {
    await attachUserToRequest(cookies.session, request)
  }

  const response = await resolve(request)

  // after endpoint or page is called
  deleteCookieIfNoUser(request, response)
  return response
}

// Only runs for page requests - not endpoints
export const getSession: GetSession = (request) => {
  return request.locals.user ? { user: request.locals.user } : {}
}