import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({locals})=> {
	const { user } = locals
	const authorized = ['admin']
	console.log('admin/+page.server.ts', user)
	if (!user || !authorized.includes(user.role)) {
		throw redirect(302, '/login?referrer=/admin')
	}

	return {
    message: 'Admin-only content from endpoint.'
  }
}
