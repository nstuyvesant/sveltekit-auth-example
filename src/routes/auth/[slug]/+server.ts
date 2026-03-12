import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

/**
 * Catch-all POST handler for unrecognized `/auth/*` paths.
 *
 * Specific auth routes (`login`, `register`, `logout`, etc.) each have their
 * own `+server.ts` and take precedence over this dynamic segment. Any request
 * that reaches here targets an invalid endpoint.
 *
 * @throws 404 always.
 */
export const POST: RequestHandler = async () => {
	error(404, 'Invalid endpoint.')
}
