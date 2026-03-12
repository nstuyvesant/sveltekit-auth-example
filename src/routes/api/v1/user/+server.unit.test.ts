import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$lib/server/db', () => ({ query: vi.fn() }))

import { PUT, DELETE } from './+server'
import { query } from '$lib/server/db'

const mockQuery = vi.mocked(query)

const adminUser: UserProperties = { id: 42, role: 'admin', email: 'admin@example.com' }

function makeEvent({
	noUser = false,
	body = {} as unknown
} = {}) {
	return {
		locals: { user: noUser ? undefined : adminUser },
		request: { json: vi.fn().mockResolvedValue(body) },
		cookies: { delete: vi.fn() }
	} as unknown as Parameters<typeof PUT>[0]
}

beforeEach(() => {
	mockQuery.mockReset()
})

// ── PUT ───────────────────────────────────────────────────────────────────────

describe('PUT /api/v1/user', () => {
	it('returns 200 with a success message on valid update', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any)

		const res = await PUT(makeEvent({ body: { firstName: 'Jane' } }))

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.message).toContain('Successfully updated')
	})

	it('calls update_user with the user id and JSON-encoded update', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any)
		const update = { firstName: 'Jane', phone: '412-555-0000' }

		await PUT(makeEvent({ body: update }))

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('update_user'),
			[adminUser.id, JSON.stringify(update)]
		)
	})

	it('throws 401 when user is not authenticated', async () => {
		await expect(PUT(makeEvent({ noUser: true }))).rejects.toMatchObject({ status: 401 })
	})

	it('throws 503 when the database call fails', async () => {
		mockQuery.mockRejectedValue(new Error('db down'))

		await expect(PUT(makeEvent())).rejects.toMatchObject({ status: 503 })
	})
})

// ── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/user', () => {
	it('returns 200 with a success message on valid deletion', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any)

		const res = await DELETE(makeEvent())

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.message).toContain('deleted')
	})

	it('calls delete_user with the user id', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any)

		await DELETE(makeEvent())

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('delete_user'),
			[adminUser.id]
		)
	})

	it('deletes the session cookie on success', async () => {
		mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any)
		const event = makeEvent()

		await DELETE(event)

		expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
	})

	it('throws 401 when user is not authenticated', async () => {
		await expect(DELETE(makeEvent({ noUser: true }))).rejects.toMatchObject({ status: 401 })
	})

	it('throws 503 when the database call fails', async () => {
		mockQuery.mockRejectedValue(new Error('db down'))

		await expect(DELETE(makeEvent())).rejects.toMatchObject({ status: 503 })
	})

	it('does not delete the session cookie when the db call fails', async () => {
		mockQuery.mockRejectedValue(new Error('db down'))
		const event = makeEvent()

		await DELETE(event).catch(() => {})

		expect(event.cookies.delete).not.toHaveBeenCalled()
	})
})
