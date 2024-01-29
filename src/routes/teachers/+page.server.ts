import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

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
