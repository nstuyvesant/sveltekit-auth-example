import * as cookie from 'cookie'
import type { Handle, GetSession } from '@sveltejs/kit'
import { query } from './routes/_db'
import type { ServerRequest, ServerResponse } from '@sveltejs/kit/types/hooks'

// Attach authorization to each server request (role may have changed)
async function attachUserToRequest(sessionId: string, request: ServerRequest) {
  const sql = `
    SELECT * FROM get_session($1);`
  const { rows } = await query(sql, [sessionId])
  if (rows?.length > 0) {
    request.locals.user = rows[0].get_session
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

// Only useful for authentication schemes that redirect back to the website - not
// an SPA with client-side routing that handles authentication seamlessly
export const getSession: GetSession = (request) => {
  return request.locals.user ?
    { user: request.locals.user }
    : {}
}