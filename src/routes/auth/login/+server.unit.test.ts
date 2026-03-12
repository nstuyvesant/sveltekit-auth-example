import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { JWT_SECRET: 'test-secret' } }))
vi.mock('$lib/server/db', () => ({ query: vi.fn() }))
vi.mock('$lib/server/email', () => ({ sendMfaCodeEmail: vi.fn() }))
vi.mock('$lib/server/turnstile', () => ({ verifyTurnstileToken: vi.fn() }))

import { POST } from './+server'
import { query } from '$lib/server/db'
import { sendMfaCodeEmail } from '$lib/server/email'
import { verifyTurnstileToken } from '$lib/server/turnstile'
import jwt from 'jsonwebtoken'

const mockQuery = vi.mocked(query)
const mockSendMfaCodeEmail = vi.mocked(sendMfaCodeEmail)
const mockVerifyTurnstileToken = vi.mocked(verifyTurnstileToken)

const mockUser: User = {
	id: 7,
	email: 'user@example.com',
	firstName: 'Jane',
	lastName: 'Doe',
	role: 'user'
}

const successResult: AuthenticationResult = {
	user: mockUser,
	sessionId: 'sess-123',
	status: 'Login successful.',
	statusCode: 200
}

const failResult: AuthenticationResult = {
	user: null,
	sessionId: '',
	status: 'Invalid credentials.',
	statusCode: 401
}

function makeEvent({
	body = { email: 'user@example.com', password: 'Password1!', turnstileToken: 'tok' } as Record<
		string,
		unknown
	>,
	mfaTrustedCookie = undefined as string | undefined
} = {}) {
	return {
		request: {
			json: vi.fn().mockResolvedValue(body),
			headers: { get: vi.fn().mockReturnValue(null) }
		},
		cookies: {
			get: vi.fn().mockReturnValue(mfaTrustedCookie),
			set: vi.fn(),
			delete: vi.fn()
		},
		locals: {} as App.Locals,
		getClientAddress: vi.fn().mockReturnValue('127.0.0.1')
	} as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifyTurnstileToken.mockResolvedValue(true)
})

// ── MFA flow ─────────────────────────────────────────────────────────────────

describe('POST /auth/login — MFA flow', () => {
	beforeEach(() => {
		mockQuery
			.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any) // authenticate
			.mockResolvedValueOnce({ rows: [] } as any) // delete_session
			.mockResolvedValueOnce({ rows: [{ code: '123456' }] } as any) // create_mfa_code
	})

	it('returns { mfaRequired: true } when no trusted cookie is present', async () => {
		const res = await POST(makeEvent())

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body).toEqual({ mfaRequired: true })
	})

	it('emails the MFA code to the user', async () => {
		await POST(makeEvent())

		expect(mockSendMfaCodeEmail).toHaveBeenCalledWith('user@example.com', '123456')
	})

	it('deletes the pre-created session before sending the MFA code', async () => {
		await POST(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('delete_session'), [mockUser.id])
	})

	it('does not set a session cookie', async () => {
		const event = makeEvent()
		await POST(event)
		expect(event.cookies.set).not.toHaveBeenCalled()
	})
})

// ── MFA trusted device ───────────────────────────────────────────────────────

describe('POST /auth/login — MFA trusted device', () => {
	it('skips MFA and returns { message, user } when trusted cookie is valid', async () => {
		const trustedToken = jwt.sign({ userId: mockUser.id, purpose: 'mfa-trusted' }, 'test-secret')
		mockQuery.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any)

		const res = await POST(makeEvent({ mfaTrustedCookie: trustedToken }))

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.user).toEqual(mockUser)
		expect(body.mfaRequired).toBeUndefined()
	})

	it('sets a session cookie when the trusted cookie is valid', async () => {
		const trustedToken = jwt.sign({ userId: mockUser.id, purpose: 'mfa-trusted' }, 'test-secret')
		mockQuery.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any)
		const event = makeEvent({ mfaTrustedCookie: trustedToken })

		await POST(event)

		expect(event.cookies.set).toHaveBeenCalledWith(
			'session',
			'sess-123',
			expect.objectContaining({
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				path: '/'
			})
		)
	})

	it('sets event.locals.user when the trusted cookie is valid', async () => {
		const trustedToken = jwt.sign({ userId: mockUser.id, purpose: 'mfa-trusted' }, 'test-secret')
		mockQuery.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any)
		const event = makeEvent({ mfaTrustedCookie: trustedToken })

		await POST(event)

		expect(event.locals.user).toEqual(mockUser)
	})

	it('falls through to MFA when the trusted cookie has the wrong purpose', async () => {
		const badToken = jwt.sign({ userId: mockUser.id, purpose: 'other' }, 'test-secret')
		mockQuery
			.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any)
			.mockResolvedValueOnce({ rows: [] } as any)
			.mockResolvedValueOnce({ rows: [{ code: '654321' }] } as any)

		const res = await POST(makeEvent({ mfaTrustedCookie: badToken }))

		expect((await res.json()).mfaRequired).toBe(true)
	})

	it('falls through to MFA and deletes cookie when trusted token is expired', async () => {
		const expiredToken = jwt.sign({ userId: mockUser.id, purpose: 'mfa-trusted' }, 'test-secret', {
			expiresIn: -1
		})
		mockQuery
			.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any)
			.mockResolvedValueOnce({ rows: [] } as any)
			.mockResolvedValueOnce({ rows: [{ code: '654321' }] } as any)
		const event = makeEvent({ mfaTrustedCookie: expiredToken })

		await POST(event)

		expect(event.cookies.delete).toHaveBeenCalledWith('mfa_trusted', { path: '/' })
	})
})

// ── Credential failures ───────────────────────────────────────────────────────

describe('POST /auth/login — credential failures', () => {
	it('throws the DB status code on invalid credentials', async () => {
		mockQuery.mockResolvedValueOnce({ rows: [{ authenticationResult: failResult }] } as any)

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 401 })
	})

	it('throws 503 when the database is unreachable', async () => {
		mockQuery.mockRejectedValueOnce(new Error('db down'))

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 503 })
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
})

// ── Brute-force lockout ───────────────────────────────────────────────────────

describe('POST /auth/login — brute-force lockout', () => {
	it('throws 429 after 5 failed attempts', async () => {
		mockQuery.mockResolvedValue({ rows: [{ authenticationResult: failResult }] } as any)

		// 5 failures to trigger lockout
		for (let i = 0; i < 5; i++) {
			await POST(
				makeEvent({
					body: { email: 'lockout@example.com', password: 'wrong', turnstileToken: 'tok' }
				})
			).catch(() => {})
		}

		await expect(
			POST(
				makeEvent({
					body: { email: 'lockout@example.com', password: 'wrong', turnstileToken: 'tok' }
				})
			)
		).rejects.toMatchObject({ status: 429 })
	})

	it('clears the lockout tracker on successful login', async () => {
		// Register a failed attempt first
		mockQuery.mockResolvedValueOnce({ rows: [{ authenticationResult: failResult }] } as any)
		await POST(
			makeEvent({ body: { email: 'clear@example.com', password: 'wrong', turnstileToken: 'tok' } })
		).catch(() => {})

		// Then succeed — mfa flow needs 3 query responses
		mockQuery
			.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any)
			.mockResolvedValueOnce({ rows: [] } as any)
			.mockResolvedValueOnce({ rows: [{ code: '000000' }] } as any)

		// Should not throw 429
		const res = await POST(
			makeEvent({
				body: { email: 'clear@example.com', password: 'Password1!', turnstileToken: 'tok' }
			})
		)
		expect((await res.json()).mfaRequired).toBe(true)
	})
})
