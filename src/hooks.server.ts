import type { Handle, RequestEvent } from '@sveltejs/kit'
import { error } from '@sveltejs/kit'
import { query } from '$lib/server/db'

// In-memory IP-based rate limiter for sensitive auth endpoints.
// For multi-instance deployments, replace with a shared store like Redis.
const ipRateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 20
const RATE_LIMITED_PATHS = new Set(['/auth/login', '/auth/register', '/auth/forgot', '/auth/mfa'])

function checkRateLimit(ip: string): boolean {
	const now = Date.now()
	const entry = ipRateLimit.get(ip)
	if (!entry || now > entry.resetAt) {
		ipRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
		return true
	}
	if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false
	entry.count++
	return true
}

// Periodically clean up expired entries to prevent unbounded memory growth
setInterval(
	() => {
		const now = Date.now()
		for (const [key, value] of ipRateLimit) {
			if (now > value.resetAt) ipRateLimit.delete(key)
		}
	},
	60 * 60 * 1000
)

// Attach authorization to each server request (role may have changed)
async function attachUserToRequestEvent(sessionId: string, event: RequestEvent) {
	const result = await query(
		'SELECT get_and_update_session($1::uuid)',
		[sessionId],
		'get-and-update-session'
	)
	event.locals.user = result.rows[0]?.get_and_update_session // undefined if not found
}

// Invoked for each endpoint called and initially for SSR router
export const handle = (async ({ event, resolve }) => {
	const { cookies, url } = event

	// Skip auth overhead for static asset requests
	if (url.pathname.startsWith('/_app/')) {
		return resolve(event)
	}

	// Rate limit sensitive auth endpoints by IP
	if (RATE_LIMITED_PATHS.has(url.pathname)) {
		const ip = event.getClientAddress()
		if (!checkRateLimit(ip)) {
			error(429, 'Too many requests. Please try again later.')
		}
	}

	// before endpoint or page is called
	const sessionId = cookies.get('session')
	if (sessionId) {
		await attachUserToRequestEvent(sessionId, event)
	}

	if (!event.locals.user) cookies.delete('session', { path: '/' })

	const response = await resolve(event)

	// after endpoint or page is called

	return response
}) satisfies Handle
