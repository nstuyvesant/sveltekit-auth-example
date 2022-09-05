import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ locals }) => {
	const { user } = locals
	if (user) { // Redirect to home if user is logged in already
		throw redirect(302, '/')
	}
	return {}
}
