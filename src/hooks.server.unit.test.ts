import { describe, it, expect, vi, beforeEach } from 'vitest'
import { error } from '@sveltejs/kit'

vi.mock('$lib/server/db', () => ({ query: vi.fn() }))

import { handle } from './hooks.server'
import { query } from '$lib/server/db'

const mockQuery = vi.mocked(query)

/** Build a minimal event object for the hook. */
function makeEvent({
	pathname = '/page',
	sessionCookie = undefined as string | undefined,
	ip = '1.2.3.4'
} = {}) {
	const cookieStore = new Map<string, string>()
	if (sessionCookie) cookieStore.set('session', sessionCookie)

	return {
		url: new URL(`http://localhost${pathname}`),
		cookies: {
			get: (name: string) => cookieStore.get(name),
			delete: vi.fn()
		},
		locals: {} as Record<string, unknown>,
		getClientAddress: () => ip
	} as unknown as Parameters<typeof handle>[0]['event']
}

const resolve = vi.fn(async (event: unknown) => new Response('ok', { status: 200 }))

beforeEach(() => {
	vi.resetAllMocks()
	resolve.mockResolvedValue(new Response('ok', { status: 200 }))
})

// ── Static asset bypass ────────────────────────────────────────────────────────

describe('static asset bypass', () => {
	it('calls resolve immediately for /_app/ paths without touching the db', async () => {
		const event = makeEvent({ pathname: '/_app/immutable/app.js' })

		await handle({ event, resolve })

		expect(resolve).toHaveBeenCalledOnce()
		expect(mockQuery).not.toHaveBeenCalled()
	})
})

// ── Rate limiting ──────────────────────────────────────────────────────────────

describe('rate limiting', () => {
	it('allows requests under the limit', async () => {
		const event = makeEvent({ pathname: '/auth/login', ip: '10.0.0.1' })

		await expect(handle({ event, resolve })).resolves.not.toThrow()
	})

	it('throws 429 after exceeding the request limit for a rate-limited path', async () => {
		const ip = '10.0.0.99'

		// Exhaust the 20-request allowance
		for (let i = 0; i < 20; i++) {
			await handle({ event: makeEvent({ pathname: '/auth/login', ip }), resolve }).catch(() => {})
		}

		await expect(
			handle({ event: makeEvent({ pathname: '/auth/login', ip }), resolve })
		).rejects.toMatchObject({ status: 429 })
	})

	it('does not rate-limit non-auth paths', async () => {
		const ip = '10.0.0.2'

		for (let i = 0; i < 25; i++) {
			await handle({ event: makeEvent({ pathname: '/about', ip }), resolve })
		}

		expect(resolve).toHaveBeenCalledTimes(25)
	})
})

// ── Session handling ───────────────────────────────────────────────────────────

describe('session handling', () => {
	it('attaches user to locals when a valid session cookie is present', async () => {
		const user = { id: 1, role: 'admin' }
		mockQuery.mockResolvedValue({ rows: [{ get_and_update_session: user }] } as any)

		const event = makeEvent({ sessionCookie: 'valid-session-uuid' })

		await handle({ event, resolve })

		expect(event.locals.user).toEqual(user)
	})

	it('does not call query when no session cookie is present', async () => {
		const event = makeEvent()

		await handle({ event, resolve })

		expect(mockQuery).not.toHaveBeenCalled()
	})

	it('deletes the session cookie when the session is not found in the db', async () => {
		mockQuery.mockResolvedValue({ rows: [{ get_and_update_session: undefined }] } as any)

		const event = makeEvent({ sessionCookie: 'stale-session-uuid' })

		await handle({ event, resolve })

		expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
	})

	it('deletes the session cookie when no session cookie is present and locals.user is unset', async () => {
		const event = makeEvent()

		await handle({ event, resolve })

		expect(event.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
	})

	it('does not delete the session cookie when a valid session exists', async () => {
		const user = { id: 2, role: 'student' }
		mockQuery.mockResolvedValue({ rows: [{ get_and_update_session: user }] } as any)

		const event = makeEvent({ sessionCookie: 'valid-session-uuid' })

		await handle({ event, resolve })

		expect(event.cookies.delete).not.toHaveBeenCalled()
	})

	it('uses the named prepared statement for session lookup', async () => {
		mockQuery.mockResolvedValue({ rows: [{ get_and_update_session: { id: 3 } }] } as any)

		const event = makeEvent({ sessionCookie: 'some-uuid' })

		await handle({ event, resolve })

		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining('get_and_update_session'),
			['some-uuid'],
			'get-and-update-session'
		)
	})
})

// ── Response pass-through ──────────────────────────────────────────────────────

describe('response', () => {
	it('returns the response from resolve', async () => {
		const fakeResponse = new Response('hello', { status: 200 })
		resolve.mockResolvedValue(fakeResponse)

		const event = makeEvent()

		const result = await handle({ event, resolve })

		expect(result).toBe(fakeResponse)
	})
})
