import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { JWT_SECRET: 'test-secret' } }))
vi.mock('$lib/server/db', () => ({ query: vi.fn() }))
vi.mock('$lib/server/email', () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock('$lib/server/turnstile', () => ({ verifyTurnstileToken: vi.fn() }))

import { POST } from './+server'
import { query } from '$lib/server/db'
import { sendPasswordResetEmail } from '$lib/server/email'
import { verifyTurnstileToken } from '$lib/server/turnstile'

const mockQuery = vi.mocked(query)
const mockSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail)
const mockVerifyTurnstileToken = vi.mocked(verifyTurnstileToken)

function makeEvent(body: Record<string, unknown> = {}) {
	return {
		request: {
			json: vi.fn().mockResolvedValue({ turnstileToken: 'tok', email: 'user@example.com', ...body }),
			headers: { get: vi.fn().mockReturnValue(null) }
		},
		getClientAddress: vi.fn().mockReturnValue('127.0.0.1')
	} as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifyTurnstileToken.mockResolvedValue(true)
})

describe('POST /auth/forgot', () => {
	it('returns 204 when user email exists', async () => {
		mockQuery.mockResolvedValue({ rows: [{ userId: 1 }], rowCount: 1 } as any)
		mockSendPasswordResetEmail.mockResolvedValue(undefined)

		const res = await POST(makeEvent())

		expect(res.status).toBe(204)
	})

	it('returns 204 when email is not found (prevents user enumeration)', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any)

		const res = await POST(makeEvent())

		expect(res.status).toBe(204)
	})

	it('sends a password reset email when user exists', async () => {
		mockQuery.mockResolvedValue({ rows: [{ userId: 7 }], rowCount: 1 } as any)
		mockSendPasswordResetEmail.mockResolvedValue(undefined)

		await POST(makeEvent())

		expect(mockSendPasswordResetEmail).toHaveBeenCalledOnce()
		expect(mockSendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', expect.any(String))
	})

	it('does not send an email when user is not found', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any)

		await POST(makeEvent())

		expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
	})

	it('queries users table with the provided email', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any)

		await POST(makeEvent({ email: 'test@example.com' }))

		expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('users'), ['test@example.com'])
	})

	it('throws 400 when Turnstile verification fails', async () => {
		mockVerifyTurnstileToken.mockResolvedValue(false)

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 400 })
	})

	it('verifies the Turnstile token using the CF-Connecting-IP header when present', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any)
		const event = makeEvent()
		vi.mocked(event.request.headers.get).mockReturnValue('1.2.3.4')

		await POST(event)

		expect(mockVerifyTurnstileToken).toHaveBeenCalledWith('tok', '1.2.3.4')
	})

	it('falls back to getClientAddress when CF-Connecting-IP is absent', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any)
		const event = makeEvent()
		vi.mocked(event.request.headers.get).mockReturnValue(null)

		await POST(event)

		expect(mockVerifyTurnstileToken).toHaveBeenCalledWith('tok', '127.0.0.1')
	})

	it('still returns 204 when sendPasswordResetEmail throws', async () => {
		mockQuery.mockResolvedValue({ rows: [{ userId: 3 }], rowCount: 1 } as any)
		mockSendPasswordResetEmail.mockRejectedValue(new Error('SMTP failure'))

		const res = await POST(makeEvent())

		expect(res.status).toBe(204)
	})
})
