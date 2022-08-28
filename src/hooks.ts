import * as cookie from 'cookie'
import type { Handle, RequestEvent } from '@sveltejs/kit'
import { query } from './routes/_db'

// Attach authorization to each server request (role may have changed)
async function attachUserToRequest(sessionId: string, event: RequestEvent) {
  const sql = `
    SELECT * FROM get_session($1);`
  const { rows } = await query(sql, [sessionId])
  if (rows?.length > 0) {
    event.locals.user = <User> rows[0].get_session
  }
}

function deleteCookieIfNoUser(event: RequestEvent, response: Response) {
  if (!event.locals.user) {
    response.headers.set('Set-Cookie', `session=; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date().toUTCString()}`)
  }
}

// Invoked for each endpoint called and initially for SSR router
export const handle: Handle = async ({ event, resolve }) => {

  // before endpoint or page is called
  const cookies = cookie.parse(event.request.headers.get('Cookie') || '')
  if (cookies.session) {
    await attachUserToRequest(cookies.session, event)
  }

  const response = await resolve(event)

  // after endpoint or page is called
  deleteCookieIfNoUser(event, response)
  return response
}
