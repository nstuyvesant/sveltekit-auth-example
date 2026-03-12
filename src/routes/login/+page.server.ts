import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

/**
 * Page server load function for the login route.
 *
 * Redirects already-authenticated users to the home page so they don't see
 * the login form unnecessarily.
 *
 * @returns An empty object for unauthenticated users.
 */
export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(302, '/')
	}
	return {}
}
