// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('$app/navigation', () => ({ goto: vi.fn() }))
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/dashboard') } }))
vi.mock('$lib/app-state.svelte', () => ({ appState: { user: undefined } }))

import { setupFetchInterceptor } from './fetch-interceptor'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { appState } from '$lib/app-state.svelte'

const mockGoto = vi.mocked(goto)
const mockPage = page as { url: URL }

function makeResponse(status: number) {
	return new Response(null, { status })
}

describe('setupFetchInterceptor', () => {
	let originalFetch: typeof fetch

	beforeEach(() => {
		// Save and restore window.fetch around each test
		originalFetch = window.fetch
		mockGoto.mockReset()
		appState.user = { id: 1, role: 'admin', email: 'a@b.com', firstName: 'A', lastName: 'B', phone: '', optOut: false }
		setupFetchInterceptor()
	})

	afterEach(() => {
		window.fetch = originalFetch
		appState.user = undefined
	})

	it('patches window.fetch', () => {
		expect(window.fetch).not.toBe(originalFetch)
	})

	it('returns the response unchanged for non-401 status codes', async () => {
		window.fetch = vi.fn().mockResolvedValue(makeResponse(200))
		setupFetchInterceptor()

		const res = await window.fetch('/api/data')

		expect(res.status).toBe(200)
		expect(mockGoto).not.toHaveBeenCalled()
	})

	it('does not redirect on 401 when no user is logged in', async () => {
		appState.user = undefined
		window.fetch = vi.fn().mockResolvedValue(makeResponse(401))
		setupFetchInterceptor()

		await window.fetch('/api/data')

		expect(mockGoto).not.toHaveBeenCalled()
	})

	it('clears appState.user on 401 when a user is logged in', async () => {
		window.fetch = vi.fn().mockResolvedValue(makeResponse(401))
		setupFetchInterceptor()

		await window.fetch('/api/data')

		expect(appState.user).toBeUndefined()
	})

	it('redirects to /login with the current path as referrer on 401', async () => {
		mockPage.url = new URL('http://localhost/dashboard?tab=profile')
		window.fetch = vi.fn().mockResolvedValue(makeResponse(401))
		setupFetchInterceptor()

		await window.fetch('/api/data')

		expect(mockGoto).toHaveBeenCalledWith(
			'/login?referrer=' + encodeURIComponent('/dashboard?tab=profile')
		)
	})

	it('still returns the 401 response to the caller', async () => {
		window.fetch = vi.fn().mockResolvedValue(makeResponse(401))
		setupFetchInterceptor()

		const res = await window.fetch('/api/data')

		expect(res.status).toBe(401)
	})

	it('passes all fetch arguments through to the original fetch', async () => {
		const innerFetch = vi.fn().mockResolvedValue(makeResponse(200))
		window.fetch = innerFetch
		setupFetchInterceptor()

		await window.fetch('/api/endpoint', { method: 'POST', body: 'data' })

		expect(innerFetch).toHaveBeenCalledWith('/api/endpoint', { method: 'POST', body: 'data' })
	})
})
