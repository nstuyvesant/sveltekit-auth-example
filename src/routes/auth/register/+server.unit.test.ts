import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { JWT_SECRET: 'test-secret' } }))
vi.mock('$lib/server/db', () => ({ query: vi.fn() }))
vi.mock('$lib/server/email', () => ({ sendVerificationEmail: vi.fn() }))
vi.mock('$lib/server/turnstile', () => ({ verifyTurnstileToken: vi.fn() }))

import { POST } from './+server'
import { query } from '$lib/server/db'
import { sendVerificationEmail } from '$lib/server/email'
import { verifyTurnstileToken } from '$lib/server/turnstile'
import jwt from 'jsonwebtoken'

const mockQuery = vi.mocked(query)
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail)
const mockVerifyTurnstileToken = vi.mocked(verifyTurnstileToken)

const mockUser: User = {
	id: 9,
	email: 'new@example.com',
	firstName: 'Jane',
	lastName: 'Doe',
	role: 'user'
}

const successResult: AuthenticationResult = {
	user: mockUser,
	sessionId: 'pre-sess-abc',
	status: 'Registration successful.',
	statusCode: 200
}

const validBody = {
	email: 'new@example.com',
	password: 'Password1!',
	firstName: 'Jane',
	lastName: 'Doe',
	turnstileToken: 'tok'
}

function makeEvent(body: Record<string, unknown> = validBody) {
	return {
		request: {
			json: vi.fn().mockResolvedValue(body),
			headers: { get: vi.fn().mockReturnValue(null) }
		},
		getClientAddress: vi.fn().mockReturnValue('127.0.0.1')
	} as unknown as Parameters<typeof POST>[0]
}

/** Set up the two DB calls for a happy-path registration. */
function setupSuccessQueries() {
	mockQuery
		.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any) // register
		.mockResolvedValueOnce({ rows: [] } as any) // delete_session
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifyTurnstileToken.mockResolvedValue(true)
	mockSendVerificationEmail.mockResolvedValue(undefined)
})

describe('POST /auth/register', () => {
	it('returns 200 with success message and emailVerification flag', async () => {
		setupSuccessQueries()

		const res = await POST(makeEvent())

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.emailVerification).toBe(true)
		expect(body.message).toContain('Registration successful')
	})

	it('sends a verification email to the registered address', async () => {
		setupSuccessQueries()

		await POST(makeEvent())

		expect(mockSendVerificationEmail).toHaveBeenCalledOnce()
		expect(mockSendVerificationEmail).toHaveBeenCalledWith('new@example.com', expect.any(String))
	})

	it('sends a JWT with purpose verify-email and the user id as subject', async () => {
		setupSuccessQueries()

		await POST(makeEvent())

		const [, token] = mockSendVerificationEmail.mock.calls[0]
		const payload = jwt.verify(token, 'test-secret') as Record<string, unknown>
		expect(payload.purpose).toBe('verify-email')
		expect(payload.subject).toBe(mockUser.id)
	})

	it('deletes the pre-verification session after successful registration', async () => {
		setupSuccessQueries()

		await POST(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('delete_session'), [
			successResult.sessionId
		])
	})

	it('calls the register SQL function with the full body', async () => {
		setupSuccessQueries()

		await POST(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('register'), [
			JSON.stringify(validBody)
		])
	})

	it('still sends the verification email when delete_session fails', async () => {
		mockQuery
			.mockResolvedValueOnce({ rows: [{ authenticationResult: successResult }] } as any)
			.mockRejectedValueOnce(new Error('db down'))

		const res = await POST(makeEvent())

		expect(mockSendVerificationEmail).toHaveBeenCalledOnce()
		expect(res.status).toBe(200)
	})
})

describe('POST /auth/register — validation', () => {
	it('throws 400 when email is missing', async () => {
		const { email: _, ...noEmail } = validBody
		await expect(POST(makeEvent(noEmail))).rejects.toMatchObject({ status: 400 })
	})

	it('throws 400 when password is missing', async () => {
		const { password: _, ...noPassword } = validBody
		await expect(POST(makeEvent(noPassword))).rejects.toMatchObject({ status: 400 })
	})

	it('throws 400 when firstName is missing', async () => {
		const { firstName: _, ...noFirst } = validBody
		await expect(POST(makeEvent(noFirst))).rejects.toMatchObject({ status: 400 })
	})

	it('throws 400 when lastName is missing', async () => {
		const { lastName: _, ...noLast } = validBody
		await expect(POST(makeEvent(noLast))).rejects.toMatchObject({ status: 400 })
	})

	it('throws 400 when password has no uppercase letter', async () => {
		await expect(POST(makeEvent({ ...validBody, password: 'password1!' }))).rejects.toMatchObject({
			status: 400
		})
	})

	it('throws 400 when password has no number', async () => {
		await expect(POST(makeEvent({ ...validBody, password: 'Password!' }))).rejects.toMatchObject({
			status: 400
		})
	})

	it('throws 400 when password has no special character', async () => {
		await expect(POST(makeEvent({ ...validBody, password: 'Password1' }))).rejects.toMatchObject({
			status: 400
		})
	})

	it('throws 400 when password is too short', async () => {
		await expect(POST(makeEvent({ ...validBody, password: 'P1!' }))).rejects.toMatchObject({
			status: 400
		})
	})

	it('throws 400 when Turnstile verification fails', async () => {
		mockVerifyTurnstileToken.mockResolvedValue(false)
		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 400 })
	})

	it('throws 400 when the request body is invalid JSON', async () => {
		const event = makeEvent()
		vi.mocked(event.request.json).mockRejectedValue(new SyntaxError('Unexpected token'))
		await expect(POST(event)).rejects.toMatchObject({ status: 400 })
	})

	it('throws 503 when the database is unreachable', async () => {
		mockQuery.mockRejectedValueOnce(new Error('db down'))
		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 503 })
	})

	it('throws the DB status code on registration failure (e.g. duplicate email)', async () => {
		const dupResult: AuthenticationResult = {
			user: null,
			sessionId: '',
			status: 'Email already registered.',
			statusCode: 409
		}
		mockQuery.mockResolvedValueOnce({ rows: [{ authenticationResult: dupResult }] } as any)
		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 409 })
	})
})
