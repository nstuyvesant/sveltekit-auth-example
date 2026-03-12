import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

/**
 * Page server load function for the teachers route.
 *
 * Restricts access to users with the `teacher` or `admin` role. Unauthenticated
 * or unauthorized users are redirected to the login page with a `referrer`
 * parameter so they are returned here after logging in.
 *
 * @returns An object with a placeholder `message` for teacher/admin-only server content.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals
	const authorized = ['admin', 'teacher']
	if (!user || !authorized.includes(user.role)) {
		redirect(302, '/login?referrer=/teachers')
	}

	return {
		message: 'Teachers or Admin-only content from server.'
	}
}
