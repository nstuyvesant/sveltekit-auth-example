import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/static/public', () => ({ PUBLIC_GOOGLE_CLIENT_ID: 'test-client-id' }))
vi.mock('$lib/server/db', () => ({ query: vi.fn() }))
vi.mock('google-auth-library', () => ({
	OAuth2Client: vi.fn()
}))

import { POST } from './+server'
import { query } from '$lib/server/db'
import { OAuth2Client } from 'google-auth-library'

const mockQuery = vi.mocked(query)
const MockOAuth2Client = vi.mocked(OAuth2Client)

const mockUser: User = { id: 1, email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', role: 'user' }
const mockUserSession: UserSession = { id: 'session-abc', user: mockUser }

function makeVerifyIdToken(payload: Record<string, unknown> | null) {
	return vi.fn().mockResolvedValue({ getPayload: () => payload })
}

function setupOAuth2Mock(verifyIdToken: ReturnType<typeof vi.fn>) {
	MockOAuth2Client.mockImplementation(function () {
		return { verifyIdToken }
	} as unknown as new (clientId: string) => OAuth2Client)
}

function makeEvent(body: Record<string, unknown> = { token: 'google-jwt' }) {
	return {
		request: { json: vi.fn().mockResolvedValue(body) },
		cookies: { set: vi.fn() },
		locals: {} as App.Locals
	} as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('POST /auth/google', () => {
	it('returns 200 with user data on successful sign-in', async () => {
		setupOAuth2Mock(makeVerifyIdToken({ given_name: 'Jane', family_name: 'Doe', email: 'jane@example.com' }))
		mockQuery.mockResolvedValue({ rows: [{ user_session: mockUserSession }] } as any)

		const res = await POST(makeEvent())

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.message).toBe('Successful Google Sign-In.')
		expect(body.user).toEqual(mockUser)
	})

	it('sets an httpOnly session cookie on success', async () => {
		setupOAuth2Mock(makeVerifyIdToken({ given_name: 'Jane', family_name: 'Doe', email: 'jane@example.com' }))
		mockQuery.mockResolvedValue({ rows: [{ user_session: mockUserSession }] } as any)
		const event = makeEvent()

		await POST(event)

		expect(event.cookies.set).toHaveBeenCalledWith('session', 'session-abc', expect.objectContaining({
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			path: '/'
		}))
	})

	it('sets event.locals.user on success', async () => {
		setupOAuth2Mock(makeVerifyIdToken({ given_name: 'Jane', family_name: 'Doe', email: 'jane@example.com' }))
		mockQuery.mockResolvedValue({ rows: [{ user_session: mockUserSession }] } as any)
		const event = makeEvent()

		await POST(event)

		expect(event.locals.user).toEqual(mockUser)
	})

	it('uses PUBLIC_GOOGLE_CLIENT_ID when verifying the token', async () => {
		const verifyIdToken = makeVerifyIdToken({ given_name: 'Jane', family_name: 'Doe', email: 'jane@example.com' })
		setupOAuth2Mock(verifyIdToken)
		mockQuery.mockResolvedValue({ rows: [{ user_session: mockUserSession }] } as any)

		await POST(makeEvent({ token: 'my-token' }))

		expect(MockOAuth2Client).toHaveBeenCalledWith('test-client-id')
		expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'my-token', audience: 'test-client-id' })
	})

	it('passes the Google user data to the DB upsert', async () => {
		setupOAuth2Mock(makeVerifyIdToken({ given_name: 'Jane', family_name: 'Doe', email: 'jane@example.com' }))
		mockQuery.mockResolvedValue({ rows: [{ user_session: mockUserSession }] } as any)

		await POST(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('start_gmail_user_session'),
			[JSON.stringify({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' })]
		)
	})

	it('falls back to placeholder names when given_name/family_name are missing', async () => {
		setupOAuth2Mock(makeVerifyIdToken({ email: 'noname@example.com' }))
		mockQuery.mockResolvedValue({ rows: [{ user_session: mockUserSession }] } as any)

		await POST(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(
			expect.any(String),
			[JSON.stringify({ firstName: 'UnknownFirstName', lastName: 'UnknownLastName', email: 'noname@example.com' })]
		)
	})

	it('throws 401 when the Google token is invalid', async () => {
		setupOAuth2Mock(vi.fn().mockRejectedValue(new Error('Invalid token')))

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 401 })
	})

	it('throws 401 when the DB upsert fails', async () => {
		setupOAuth2Mock(makeVerifyIdToken({ given_name: 'Jane', family_name: 'Doe', email: 'jane@example.com' }))
		mockQuery.mockRejectedValue(new Error('db error'))

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 401 })
	})

	it('throws 401 when the Google payload is null', async () => {
		setupOAuth2Mock(makeVerifyIdToken(null))

		await expect(POST(makeEvent())).rejects.toMatchObject({ status: 401 })
	})
})
