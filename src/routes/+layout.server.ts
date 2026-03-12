import type { LayoutServerLoad } from './$types'

/**
 * Root layout server load function.
 *
 * Passes the authenticated user (populated by `hooks.server.ts`) down to the
 * layout and all child pages via the shared load data. Will be `undefined` when
 * no valid session exists.
 *
 * @returns An object containing the current `user`, or `undefined` if not logged in.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	const { user } = locals
	return {
		user
	}
}
