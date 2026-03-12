/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker'

const sw = self as unknown as ServiceWorkerGlobalScope

/** Unique cache name for this deployment, keyed by the SvelteKit build version. */
const CACHE = `cache-${version}`

const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
]

/**
 * On install, opens the versioned cache and pre-caches all build artifacts
 * and static files so they are available offline.
 */
sw.addEventListener('install', event => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE)
		await cache.addAll(ASSETS)
	}

	event.waitUntil(addFilesToCache())
})

/**
 * On activate, removes all caches from previous deployments, keeping only
 * the cache for the current build version.
 */
sw.addEventListener('activate', event => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key)
		}
	}

	event.waitUntil(deleteOldCaches())
})

/**
 * Intercepts GET requests and applies a cache-first strategy for pre-cached
 * assets, falling back to network-first (with cache fallback) for all other
 * requests.
 *
 * API (`/api`), auth (`/auth`), and non-HTTP requests are bypassed and go
 * directly to the network.
 */
sw.addEventListener('fetch', event => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return

	const url = new URL(event.request.url)

	// Don't intercept API, auth, or non-HTTP requests — let them go straight to the network
	const bypass =
		url.pathname.startsWith('/api') ||
		url.pathname.startsWith('/auth') ||
		(url.protocol !== 'http:' && url.protocol !== 'https:')

	if (bypass) return

	async function respond() {
		const cache = await caches.open(CACHE)

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname)
			if (response) return response
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request)

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch')
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone())
			}

			return response
		} catch (err) {
			const response = await cache.match(event.request)
			if (response) return response
			throw err
		}
	}

	event.respondWith(respond() as PromiseLike<Response>)
})
