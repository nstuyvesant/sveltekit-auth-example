import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

/**
 * Page server load function for the admin route.
 *
 * Redirects unauthenticated users or users without the `admin` role to the
 * login page (preserving the current path as a `referrer` query parameter).
 *
 * @returns An object with a placeholder `message` for admin-only server content.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals
	const authorized = ['admin']
	if (!user || !authorized.includes(user.role)) {
		redirect(302, '/login?referrer=/admin')
	}

	return { message: 'Admin-only content from server.' }
}
