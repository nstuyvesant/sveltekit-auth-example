import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { TURNSTILE_SECRET_KEY: 'test-secret-key' } }))

import { verifyTurnstileToken } from './turnstile'

describe('verifyTurnstileToken', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns false immediately for an empty token', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch')

		const result = await verifyTurnstileToken('')

		expect(result).toBe(false)
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it('returns true when the API responds with success: true', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: true }), { status: 200 })
		)

		const result = await verifyTurnstileToken('valid-token')

		expect(result).toBe(true)
	})

	it('returns false when the API responds with success: false', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: false }), { status: 200 })
		)

		const result = await verifyTurnstileToken('invalid-token')

		expect(result).toBe(false)
	})

	it('posts to the Cloudflare siteverify endpoint', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

		await verifyTurnstileToken('some-token')

		const [url, init] = fetchSpy.mock.calls[0]
		expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
		expect((init as RequestInit).method).toBe('POST')
	})

	it('includes the secret key and token in the form data', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

		await verifyTurnstileToken('my-token')

		const [, init] = fetchSpy.mock.calls[0]
		const body = (init as RequestInit).body as FormData
		expect(body.get('secret')).toBe('test-secret-key')
		expect(body.get('response')).toBe('my-token')
	})

	it('includes remoteip in the form data when ip is provided', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

		await verifyTurnstileToken('my-token', '1.2.3.4')

		const [, init] = fetchSpy.mock.calls[0]
		const body = (init as RequestInit).body as FormData
		expect(body.get('remoteip')).toBe('1.2.3.4')
	})

	it('omits remoteip from the form data when ip is not provided', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

		await verifyTurnstileToken('my-token')

		const [, init] = fetchSpy.mock.calls[0]
		const body = (init as RequestInit).body as FormData
		expect(body.get('remoteip')).toBeNull()
	})

	it('returns false and logs an error when fetch throws', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		const result = await verifyTurnstileToken('some-token')

		expect(result).toBe(false)
		expect(consoleSpy).toHaveBeenCalledWith('Turnstile verification error:', expect.any(Error))
	})

	it('returns false when the response body is not valid JSON', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not-json', { status: 200 }))
		vi.spyOn(console, 'error').mockImplementation(() => {})

		const result = await verifyTurnstileToken('some-token')

		expect(result).toBe(false)
	})
})
