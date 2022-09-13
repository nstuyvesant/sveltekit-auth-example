import type { Handle, RequestEvent } from '@sveltejs/kit'
import { query } from '$lib/server/db'

// Attach authorization to each server request (role may have changed)
async function attachUserToRequestEvent(sessionId: string, event: RequestEvent) {
  const sql = `
    SELECT * FROM get_session($1);`
  const { rows } = await query(sql, [sessionId])
  if (rows?.length > 0) {
    event.locals.user = <User> rows[0].get_session
  }
}

// Invoked for each endpoint called and initially for SSR router
export const handle: Handle = async ({ event, resolve }) => {
  const { cookies } = event
  const sessionId = cookies.get('session')

  // before endpoint or page is called
  if (sessionId) {
    await attachUserToRequestEvent(sessionId, event)
  }

  const response = await resolve(event)

  // after endpoint or page is called
  if (!event.locals.user) cookies.delete('session')

  return response
}
