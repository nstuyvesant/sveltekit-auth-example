import type { Handle, RequestEvent } from '@sveltejs/kit'
import { query } from '$lib/server/db'

// Attach authorization to each server request (role may have changed)
async function attachUserToRequestEvent(sessionId: string, event: RequestEvent) {
	const { rows } = await query('SELECT * FROM get_session($1::uuid)', [sessionId], 'get-session')
	if (rows?.length > 0) {
		event.locals.user = <User>rows[0].get_session
	}
}

// Invoked for each endpoint called and initially for SSR router
export const handle: Handle = async ({ event, resolve }) => {
	const { cookies, url } = event

	// Skip auth overhead for static asset requests
	if (url.pathname.startsWith('/_app/')) {
		return resolve(event)
	}

	// before endpoint or page is called
	const sessionId = cookies.get('session')
	if (sessionId) {
		await attachUserToRequestEvent(sessionId, event)
	}

	if (!event.locals.user) cookies.delete('session', { path: '/' })

	const response = await resolve(event)

	// after endpoint or page is called

	return response
}
