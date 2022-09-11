/// <reference lib="webworker" />
import { build, files, version } from '$service-worker'

const worker = <ServiceWorkerGlobalScope> <unknown> self
const cacheName = `cache${version}`
const toCache = build.concat(files)
const staticAssets = new Set(toCache)

worker.addEventListener('install', event => {
	// console.log('[Service Worker] Installation')
	event.waitUntil(
		caches
			.open(cacheName)
			.then(cache => cache.addAll(toCache))
			.then(() => {
				worker.skipWaiting()
			})
			.catch(error => console.error(error))
	)
})

worker.addEventListener('activate', event => {
	// console.log('[Service Worker] Activation')
	event.waitUntil(
		caches.keys()
			.then(async (keys) => {
				for (const key of keys) {
					if (key !== cacheName) await caches.delete(key)
				}
			})
	)
	worker.clients.claim() // or should this be inside the caches.keys().then()?
})

// Fetch from network into cache and fall back to cache if user offline
async function fetchAndCache(request: Request) {
	const cache = await caches.open(`offline${version}`)

	try {
		const response = await fetch(request)
		cache.put(request, response.clone())
		return response
	} catch (err) {
		const response = await cache.match(request)
		if (response) return response
		throw err
	}
}

worker.addEventListener('fetch', event => {
	if (event.request.method !== 'GET' || event.request.headers.has('range')) return

	const url = new URL(event.request.url)
	// console.log(`[Service Worker] Fetch ${url}`)

	// don't try to handle data: or blob: URIs
	const isHttp = url.protocol.startsWith('http')
	const isDevServerRequest = url.hostname === self.location.hostname && url.port !== self.location.port
	const isStaticAsset = url.host === self.location.host && staticAssets.has(url.pathname)
	const skipBecauseUncached = event.request.cache === 'only-if-cached' && !isStaticAsset

	if (isHttp && !isDevServerRequest && !skipBecauseUncached) {
		event.respondWith(
			(async () => {
				// always serve static files and bundler-generated assets from cache.
				// if your application has other URLs with data that will never change,
				// set this variable to true for them and they will only be fetched once.
				const cachedAsset = isStaticAsset && (await caches.match(event.request))

				return cachedAsset || fetchAndCache(event.request)
			})()
		)
	}
})
