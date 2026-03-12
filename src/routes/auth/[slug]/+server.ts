import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Specific auth routes (login, register, logout) have their own +server.ts files
// and take precedence over this dynamic segment. Any unrecognized path falls here.
export const POST: RequestHandler = async () => {
	error(404, 'Invalid endpoint.')
}
