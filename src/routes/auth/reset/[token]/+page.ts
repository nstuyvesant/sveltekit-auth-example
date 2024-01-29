import type { PageLoad } from './$types'

export const load: PageLoad = async event => {
	return {
		token: event.params.token
	}
}
