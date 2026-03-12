import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

/**
 * Page server load function for the register route.
 *
 * Redirects already-authenticated users to the home page so they don't see
 * the registration form unnecessarily.
 *
 * @returns An empty object for unauthenticated users.
 */
export const load: PageServerLoad = ({ locals }) => {
	const { user } = locals
	if (user) {
		redirect(302, '/')
	}
	return {}
}
