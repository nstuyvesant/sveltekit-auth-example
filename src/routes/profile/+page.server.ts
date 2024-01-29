import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

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
