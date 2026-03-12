import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$lib/server/db', () => ({ query: vi.fn() }))

import { POST } from './+server'
import { query } from '$lib/server/db'

const mockQuery = vi.mocked(query)

const mockUser: User = { id: 3, email: 'user@example.com', firstName: 'Jane', lastName: 'Doe', role: 'user' }

function makeEvent({ noUser = false } = {}) {
	return {
		locals: { user: noUser ? undefined : mockUser },
		cookies: { delete: vi.fn() }
	} as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('POST /auth/logout', () => {
	it('returns 200 with a logout message', async () => {
		mockQuery.mockResolvedValue({ rows: [] } as any)
		const res = await POST(makeEvent())

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.message).toBe('Logout successful.')
	})

	it('deletes the session cookie', async () => {
		mockQuery.mockResolvedValue({ rows: [] } as any)
		const event = makeEvent()

		await POST(event)

		expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
	})

	it('calls delete_session with the user id when authenticated', async () => {
		mockQuery.mockResolvedValue({ rows: [] } as any)

		await POST(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('delete_session'),
			[mockUser.id]
		)
	})

	it('skips the DB call when no user is authenticated', async () => {
		const event = makeEvent({ noUser: true })

		await POST(event)

		expect(mockQuery).not.toHaveBeenCalled()
	})

	it('still deletes the cookie when no user is authenticated', async () => {
		const event = makeEvent({ noUser: true })

		await POST(event)

		expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
	})

	it('still deletes the cookie when the DB call fails', async () => {
		mockQuery.mockRejectedValue(new Error('db down'))
		const event = makeEvent()

		await POST(event)

		expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
	})

	it('still returns 200 when the DB call fails', async () => {
		mockQuery.mockRejectedValue(new Error('db down'))

		const res = await POST(makeEvent())

		expect(res.status).toBe(200)
	})
})
