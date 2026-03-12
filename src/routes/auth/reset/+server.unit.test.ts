import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { JWT_SECRET: 'test-secret' } }))
vi.mock('$lib/server/db', () => ({ query: vi.fn() }))
vi.mock('$lib/server/turnstile', () => ({ verifyTurnstileToken: vi.fn() }))

import { PUT } from './+server'
import { query } from '$lib/server/db'
import { verifyTurnstileToken } from '$lib/server/turnstile'
import jwt from 'jsonwebtoken'

const mockQuery = vi.mocked(query)
const mockVerifyTurnstileToken = vi.mocked(verifyTurnstileToken)

function makeResetToken(overrides: Record<string, unknown> = {}) {
	return jwt.sign({ subject: 42, purpose: 'reset-password', ...overrides }, 'test-secret', { expiresIn: '30m' })
}

function makeEvent(body: Record<string, unknown> = {}) {
	return {
		request: {
			json: vi.fn().mockResolvedValue({
				token: makeResetToken(),
				password: 'NewPassword1!',
				turnstileToken: 'tok',
				...body
			}),
			headers: { get: vi.fn().mockReturnValue(null) }
		},
		getClientAddress: vi.fn().mockReturnValue('127.0.0.1')
	} as unknown as Parameters<typeof PUT>[0]
}

function setupSuccessQueries() {
	mockQuery
		.mockResolvedValueOnce({ rows: [] } as any) // reset_password
		.mockResolvedValueOnce({ rows: [] } as any) // delete_session
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifyTurnstileToken.mockResolvedValue(true)
})

describe('PUT /auth/reset', () => {
	it('returns 200 with success message on valid reset', async () => {
		setupSuccessQueries()

		const res = await PUT(makeEvent())

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.message).toBe('Password successfully reset.')
	})

	it('calls reset_password with userId and new password', async () => {
		setupSuccessQueries()

		await PUT(makeEvent({ password: 'NewPassword1!' }))

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('reset_password'),
			[42, 'NewPassword1!']
		)
	})

	it('invalidates existing sessions after a successful reset', async () => {
		setupSuccessQueries()

		await PUT(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('delete_session'),
			[42]
		)
	})

	it('still returns 200 when session invalidation fails', async () => {
		mockQuery
			.mockResolvedValueOnce({ rows: [] } as any)
			.mockRejectedValueOnce(new Error('db down'))

		const res = await PUT(makeEvent())

		expect(res.status).toBe(200)
	})

	it('returns 403 when the token is expired', async () => {
		const expiredToken = jwt.sign({ subject: 42, purpose: 'reset-password' }, 'test-secret', { expiresIn: -1 })

		const res = await PUT(makeEvent({ token: expiredToken }))

		expect(res.status).toBe(403)
		const body = await res.json()
		expect(body.message).toContain('expired')
	})

	it('returns 403 when the token has the wrong purpose', async () => {
		const wrongToken = makeResetToken({ purpose: 'verify-email' })

		const res = await PUT(makeEvent({ token: wrongToken }))

		expect(res.status).toBe(403)
	})

	it('returns 403 when the token is tampered', async () => {
		const tamperedToken = makeResetToken() + 'tampered'

		const res = await PUT(makeEvent({ token: tamperedToken }))

		expect(res.status).toBe(403)
	})

	it('returns 400 when Turnstile verification fails', async () => {
		mockVerifyTurnstileToken.mockResolvedValue(false)

		const res = await PUT(makeEvent())

		expect(res.status).toBe(400)
	})

	it('uses CF-Connecting-IP header when present', async () => {
		setupSuccessQueries()
		const event = makeEvent()
		vi.mocked(event.request.headers.get).mockReturnValue('5.5.5.5')

		await PUT(event)

		expect(mockVerifyTurnstileToken).toHaveBeenCalledWith('tok', '5.5.5.5')
	})

	it('falls back to getClientAddress when CF-Connecting-IP is absent', async () => {
		setupSuccessQueries()

		await PUT(makeEvent())

		expect(mockVerifyTurnstileToken).toHaveBeenCalledWith('tok', '127.0.0.1')
	})
})
