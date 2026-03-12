import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { JWT_SECRET: 'test-secret' } }))
vi.mock('$lib/server/db', () => ({ query: vi.fn() }))
vi.mock('$lib/server/turnstile', () => ({ verifyTurnstileToken: vi.fn() }))

import { POST } from './+server'
import { query } from '$lib/server/db'
import { verifyTurnstileToken } from '$lib/server/turnstile'
import jwt from 'jsonwebtoken'

const mockQuery = vi.mocked(query)
const mockVerifyTurnstileToken = vi.mocked(verifyTurnstileToken)

const mockUser: UserProperties = {
	id: 5,
	email: 'user@example.com',
	firstName: 'Jane',
	lastName: 'Doe',
	role: 'student'
}

function makeEvent(
	body: Record<string, unknown> = {
		email: 'user@example.com',
		code: '123456',
		turnstileToken: 'tok'
	}
) {
	return {
		request: {
			json: vi.fn().mockResolvedValue(body),
			headers: { get: vi.fn().mockReturnValue(null) }
		},
		cookies: { set: vi.fn() },
		getClientAddress: vi.fn().mockReturnValue('127.0.0.1')
	} as unknown as Parameters<typeof POST>[0]
}

/** Set up the three DB calls needed for a successful MFA verification. */
function setupSuccessQueries() {
	mockQuery
		.mockResolvedValueOnce({ rows: [{ userId: mockUser.id }] } as any) // verify_mfa_code
		.mockResolvedValueOnce({ rows: [{ sessionId: 'sess-xyz' }] } as any) // create_session
		.mockResolvedValueOnce({ rows: [{ get_session: mockUser }] } as any) // get_session
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifyTurnstileToken.mockResolvedValue(true)
})

describe('POST /auth/mfa', () => {
	it('returns 200 with message and user on success', async () => {
		setupSuccessQueries()

		const res = await POST(makeEvent())

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.message).toBe('Login successful.')
		expect(body.user).toEqual(mockUser)
	})

	it('sets an httpOnly session cookie on success', async () => {
		setupSuccessQueries()
		const event = makeEvent()

		await POST(event)

		expect(event.cookies.set).toHaveBeenCalledWith(
			'session',
			'sess-xyz',
			expect.objectContaining({
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				path: '/'
			})
		)
	})

	it('sets an mfa_trusted cookie on success', async () => {
		setupSuccessQueries()
		const event = makeEvent()

		await POST(event)

		expect(event.cookies.set).toHaveBeenCalledWith(
			'mfa_trusted',
			expect.any(String),
			expect.objectContaining({
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				path: '/',
				maxAge: 30 * 24 * 60 * 60
			})
		)
	})

	it('mfa_trusted cookie is a valid JWT with correct payload', async () => {
		setupSuccessQueries()
		const event = makeEvent()

		await POST(event)

		const [, trustedToken] = vi
			.mocked(event.cookies.set)
			.mock.calls.find(([name]) => name === 'mfa_trusted')!
		const payload = jwt.verify(trustedToken as string, 'test-secret') as Record<string, unknown>
		expect(payload.userId).toBe(mockUser.id)
		expect(payload.purpose).toBe('mfa-trusted')
	})

	it('verifies the MFA code with the lowercased email', async () => {
		setupSuccessQueries()

		await POST(makeEvent({ email: 'User@Example.COM', code: '123456', turnstileToken: 'tok' }))

		expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('verify_mfa_code'), [
			'user@example.com',
			'123456'
		])
	})

	it('throws 401 when the MFA code is invalid or expired', async () => {
		mockQuery.mockResolvedValueOnce({ rows: [{ userId: null }] } as any)

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 401 })
	})

	it('throws 400 when email is missing', async () => {
		await expect(POST(makeEvent({ code: '123456', turnstileToken: 'tok' }))).rejects.toMatchObject({
			status: 400
		})
	})

	it('throws 400 when code is missing', async () => {
		await expect(
			POST(makeEvent({ email: 'user@example.com', turnstileToken: 'tok' }))
		).rejects.toMatchObject({ status: 400 })
	})

	it('throws 400 when the request body is invalid JSON', async () => {
		const event = makeEvent()
		vi.mocked(event.request.json).mockRejectedValue(new SyntaxError('Unexpected token'))

		await expect(POST(event)).rejects.toMatchObject({ status: 400 })
	})

	it('throws 400 when Turnstile verification fails', async () => {
		mockVerifyTurnstileToken.mockResolvedValue(false)

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 400 })
	})

	it('uses CF-Connecting-IP header when present', async () => {
		setupSuccessQueries()
		const event = makeEvent()
		vi.mocked(event.request.headers.get).mockReturnValue('9.9.9.9')

		await POST(event)

		expect(mockVerifyTurnstileToken).toHaveBeenCalledWith('tok', '9.9.9.9')
	})

	it('falls back to getClientAddress when CF-Connecting-IP is absent', async () => {
		setupSuccessQueries()

		await POST(makeEvent())

		expect(mockVerifyTurnstileToken).toHaveBeenCalledWith('tok', '127.0.0.1')
	})
})
