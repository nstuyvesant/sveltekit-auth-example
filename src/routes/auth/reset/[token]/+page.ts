import type { PageLoad } from './$types'

/**
 * Page load function for the password-reset route.
 *
 * Extracts the one-time reset token from the URL segment and passes it to
 * the page so it can be submitted when the user sets their new password.
 *
 * @returns An object containing the `token` URL parameter.
 */
export const load: PageLoad = async event => {
	return {
		token: event.params.token
	}
}
