import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

/**
 * Page server load function for the profile route.
 *
 * Requires the user to be authenticated with any recognized role
 * (`admin`, `teacher`, or `student`). Unauthenticated or unauthorized
 * users are redirected to the login page with a `referrer` parameter.
 *
 * @returns The authenticated `user` object for use in the page component.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals // populated by /src/hooks.ts

	const authorized = ['admin', 'teacher', 'student'] // must be logged-in
	if (!user || !authorized.includes(user.role)) {
		redirect(302, '/login?referrer=/profile')
	}

	return {
		user
	}
}
