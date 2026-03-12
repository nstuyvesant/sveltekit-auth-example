import { TURNSTILE_SECRET_KEY } from '$env/static/private'

/**
 * Verifies a Cloudflare Turnstile challenge token against the siteverify API.
 *
 * @param token - The `cf-turnstile-response` token submitted by the client.
 * @param ip - Optional client IP address passed to Cloudflare for additional validation.
 * @returns `true` if the token is valid, `false` otherwise.
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
	if (!token) return false

	const formData = new FormData()
	formData.append('secret', TURNSTILE_SECRET_KEY)
	formData.append('response', token)
	if (ip) formData.append('remoteip', ip)

	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: formData
		})
		const data: { success: boolean } = await res.json()
		return data.success === true
	} catch (err) {
		console.error('Turnstile verification error:', err)
		return false
	}
}
