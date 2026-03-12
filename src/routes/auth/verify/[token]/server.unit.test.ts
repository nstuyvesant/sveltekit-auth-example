import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { JWT_SECRET: 'test-secret' } }))
vi.mock('$lib/server/db', () => ({ query: vi.fn() }))

import { GET } from './+server'
import { query } from '$lib/server/db'
import jwt from 'jsonwebtoken'

const mockQuery = vi.mocked(query)

function makeVerifyEmailToken(overrides: Record<string, unknown> = {}) {
	return jwt.sign({ subject: '7', purpose: 'verify-email', ...overrides }, 'test-secret', {
		expiresIn: '24h'
	})
}

function makeEvent(token: string) {
	return {
		params: { token },
		cookies: { set: vi.fn() }
	} as unknown as Parameters<typeof GET>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('GET /auth/verify/[token]', () => {
	it('redirects to / on success', async () => {
		mockQuery.mockResolvedValue({ rows: [{ verify_email_and_create_session: 'sess-abc' }] } as any)

		await expect(GET(makeEvent(makeVerifyEmailToken()))).rejects.toMatchObject({
			location: '/',
			status: 302
		})
	})

	it('sets an httpOnly session cookie with the new session id', async () => {
		mockQuery.mockResolvedValue({ rows: [{ verify_email_and_create_session: 'sess-abc' }] } as any)
		const event = makeEvent(makeVerifyEmailToken())

		await Promise.resolve(GET(event)).catch(() => {})

		expect(event.cookies.set).toHaveBeenCalledWith(
			'session',
			'sess-abc',
			expect.objectContaining({
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				path: '/'
			})
		)
	})

	it('calls verify_email_and_create_session with the userId from the token', async () => {
		mockQuery.mockResolvedValue({ rows: [{ verify_email_and_create_session: 'sess-abc' }] } as any)

		await Promise.resolve(GET(makeEvent(makeVerifyEmailToken()))).catch(() => {})

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('verify_email_and_create_session'),
			['7']
		)
	})

	it('redirects to /login?error=invalid-token when the token is expired', async () => {
		const expiredToken = jwt.sign({ subject: '7', purpose: 'verify-email' }, 'test-secret', {
			expiresIn: -1
		})

		await expect(GET(makeEvent(expiredToken))).rejects.toMatchObject({
			location: '/login?error=invalid-token',
			status: 302
		})
	})

	it('redirects to /login?error=invalid-token when the token is tampered', async () => {
		const tamperedToken = makeVerifyEmailToken() + 'tampered'

		await expect(GET(makeEvent(tamperedToken))).rejects.toMatchObject({
			location: '/login?error=invalid-token',
			status: 302
		})
	})

	it('redirects to /login?error=invalid-token when the token has the wrong purpose', async () => {
		const wrongPurposeToken = makeVerifyEmailToken({ purpose: 'reset-password' })

		await expect(GET(makeEvent(wrongPurposeToken))).rejects.toMatchObject({
			location: '/login?error=invalid-token',
			status: 302
		})
	})

	it('redirects to /login?error=invalid-token when subject is missing', async () => {
		const noSubjectToken = jwt.sign({ purpose: 'verify-email' }, 'test-secret')

		await expect(GET(makeEvent(noSubjectToken))).rejects.toMatchObject({
			location: '/login?error=invalid-token',
			status: 302
		})
	})

	it('redirects to /login?error=verification-failed when the DB call fails', async () => {
		mockQuery.mockRejectedValue(new Error('db down'))

		await expect(GET(makeEvent(makeVerifyEmailToken()))).rejects.toMatchObject({
			location: '/login?error=verification-failed',
			status: 302
		})
	})

	it('redirects to /login?error=verification-failed when the DB returns no session', async () => {
		mockQuery.mockResolvedValue({ rows: [{ verify_email_and_create_session: null }] } as any)

		await expect(GET(makeEvent(makeVerifyEmailToken()))).rejects.toMatchObject({
			location: '/login?error=verification-failed',
			status: 302
		})
	})

	it('does not set the session cookie on DB failure', async () => {
		mockQuery.mockRejectedValue(new Error('db down'))
		const event = makeEvent(makeVerifyEmailToken())

		await Promise.resolve(GET(event)).catch(() => {})

		expect(event.cookies.set).not.toHaveBeenCalled()
	})
})
