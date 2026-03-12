// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'

vi.mock('$service-worker', () => ({
	build: ['/_app/app.js'],
	files: ['/favicon.png'],
	version: 'v1'
}))

const CACHE_NAME = 'cache-v1'
const ASSETS = ['/_app/app.js', '/favicon.png']

const mockCache = {
	addAll: vi.fn(),
	match: vi.fn(),
	put: vi.fn()
}

const mockCaches = {
	open: vi.fn(),
	keys: vi.fn(),
	delete: vi.fn()
}

const swHandlers: Record<string, Function> = {}

beforeAll(async () => {
	vi.stubGlobal('caches', mockCaches)

	// Spy on addEventListener to capture the handlers the SW registers
	vi.spyOn(window, 'addEventListener').mockImplementation((type: string, handler: any) => {
		swHandlers[type] = handler
	})

	// Reset module registry so the SW file re-evaluates and re-registers its listeners
	vi.resetModules()
	await import('./service-worker')

	vi.restoreAllMocks()
})

beforeEach(() => {
	vi.resetAllMocks()
	mockCaches.open.mockResolvedValue(mockCache)
	mockCaches.delete.mockResolvedValue(true)
	mockCache.addAll.mockResolvedValue(undefined)
	mockCache.match.mockResolvedValue(null)
})

afterEach(() => {
	vi.restoreAllMocks()
})

function makeExtendableEvent() {
	return { waitUntil: vi.fn() }
}

function makeFetchEvent(url: string, method = 'GET') {
	return { request: new Request(url, { method }), respondWith: vi.fn() }
}

// ── install ────────────────────────────────────────────────────────────────────

describe('install event', () => {
	it('registers an install handler', () => {
		expect(swHandlers.install).toBeTypeOf('function')
	})

	it('calls event.waitUntil with a promise', () => {
		const event = makeExtendableEvent()
		swHandlers.install(event)
		expect(event.waitUntil).toHaveBeenCalledOnce()
		expect(event.waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise)
	})

	it('opens the versioned cache', async () => {
		const event = makeExtendableEvent()
		swHandlers.install(event)
		await event.waitUntil.mock.calls[0][0]
		expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAME)
	})

	it('pre-caches all build and static assets', async () => {
		const event = makeExtendableEvent()
		swHandlers.install(event)
		await event.waitUntil.mock.calls[0][0]
		expect(mockCache.addAll).toHaveBeenCalledWith(ASSETS)
	})
})

// ── activate ───────────────────────────────────────────────────────────────────

describe('activate event', () => {
	it('registers an activate handler', () => {
		expect(swHandlers.activate).toBeTypeOf('function')
	})

	it('deletes old caches', async () => {
		mockCaches.keys.mockResolvedValue([CACHE_NAME, 'cache-old'])
		const event = makeExtendableEvent()
		swHandlers.activate(event)
		await event.waitUntil.mock.calls[0][0]
		expect(mockCaches.delete).toHaveBeenCalledWith('cache-old')
	})

	it('does not delete the current cache', async () => {
		mockCaches.keys.mockResolvedValue([CACHE_NAME, 'cache-old'])
		const event = makeExtendableEvent()
		swHandlers.activate(event)
		await event.waitUntil.mock.calls[0][0]
		expect(mockCaches.delete).not.toHaveBeenCalledWith(CACHE_NAME)
	})

	it('deletes multiple old caches', async () => {
		mockCaches.keys.mockResolvedValue([CACHE_NAME, 'cache-v0', 'cache-v0.5'])
		const event = makeExtendableEvent()
		swHandlers.activate(event)
		await event.waitUntil.mock.calls[0][0]
		expect(mockCaches.delete).toHaveBeenCalledTimes(2)
	})

	it('does nothing when there are no old caches', async () => {
		mockCaches.keys.mockResolvedValue([CACHE_NAME])
		const event = makeExtendableEvent()
		swHandlers.activate(event)
		await event.waitUntil.mock.calls[0][0]
		expect(mockCaches.delete).not.toHaveBeenCalled()
	})
})

// ── fetch ──────────────────────────────────────────────────────────────────────

describe('fetch event', () => {
	it('registers a fetch handler', () => {
		expect(swHandlers.fetch).toBeTypeOf('function')
	})

	it('ignores non-GET requests', () => {
		const event = makeFetchEvent('http://localhost/page', 'POST')
		swHandlers.fetch(event)
		expect(event.respondWith).not.toHaveBeenCalled()
	})

	it('bypasses /api requests', () => {
		const event = makeFetchEvent('http://localhost/api/v1/users')
		swHandlers.fetch(event)
		expect(event.respondWith).not.toHaveBeenCalled()
	})

	it('bypasses /auth requests', () => {
		const event = makeFetchEvent('http://localhost/auth/login')
		swHandlers.fetch(event)
		expect(event.respondWith).not.toHaveBeenCalled()
	})

	it('calls respondWith for a normal GET request', () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }))
		const event = makeFetchEvent('http://localhost/about')
		swHandlers.fetch(event)
		expect(event.respondWith).toHaveBeenCalledOnce()
	})

	it('serves a pre-cached ASSET from cache', async () => {
		const cached = new Response('<script>', { status: 200 })
		mockCache.match.mockResolvedValue(cached)

		const event = makeFetchEvent('http://localhost/_app/app.js')
		swHandlers.fetch(event)

		const result = await event.respondWith.mock.calls[0][0]
		expect(result).toBe(cached)
	})

	it('falls back to network when pre-cached ASSET is not in cache', async () => {
		const networkResponse = new Response('script', { status: 200 })
		mockCache.match.mockResolvedValue(undefined)
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(networkResponse)

		const event = makeFetchEvent('http://localhost/_app/app.js')
		swHandlers.fetch(event)

		const result = await event.respondWith.mock.calls[0][0]
		expect(result).toBe(networkResponse)
	})

	it('caches 200 network responses for unknown paths', async () => {
		const networkResponse = new Response('page html', { status: 200 })
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(networkResponse)

		const event = makeFetchEvent('http://localhost/about')
		swHandlers.fetch(event)
		await event.respondWith.mock.calls[0][0]

		expect(mockCache.put).toHaveBeenCalledWith(event.request, expect.any(Response))
	})

	it('does not cache non-200 responses', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))

		const event = makeFetchEvent('http://localhost/missing')
		swHandlers.fetch(event)
		await event.respondWith.mock.calls[0][0]

		expect(mockCache.put).not.toHaveBeenCalled()
	})

	it('falls back to cache when the network fails', async () => {
		const cachedFallback = new Response('cached page', { status: 200 })
		mockCache.match.mockResolvedValue(cachedFallback)
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

		const event = makeFetchEvent('http://localhost/about')
		swHandlers.fetch(event)

		const result = await event.respondWith.mock.calls[0][0]
		expect(result).toBe(cachedFallback)
	})

	it('throws when network fails and cache is empty', async () => {
		mockCache.match.mockResolvedValue(undefined)
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

		const event = makeFetchEvent('http://localhost/about')
		swHandlers.fetch(event)

		await expect(event.respondWith.mock.calls[0][0]).rejects.toThrow('offline')
	})
})
