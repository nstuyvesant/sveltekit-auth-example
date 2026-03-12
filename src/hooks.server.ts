import type { Handle, RequestEvent } from '@sveltejs/kit'
import { error } from '@sveltejs/kit'
import { query } from '$lib/server/db'

/**
 * In-memory IP-based rate limiter for sensitive auth endpoints.
 * @remarks For multi-instance deployments, replace with a shared store like Redis.
 */
const ipRateLimit = new Map<string, { count: number; resetAt: number }>()
/** Duration of each rate-limit window in milliseconds (15 minutes). */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
/** Maximum number of requests allowed per IP within {@link RATE_LIMIT_WINDOW_MS}. */
const RATE_LIMIT_MAX_REQUESTS = 20
/** Set of path prefixes that are subject to IP-based rate limiting. */
const RATE_LIMITED_PATHS = new Set(['/auth/login', '/auth/register', '/auth/forgot', '/auth/mfa'])

/**
 * Checks whether the given IP address is within its rate-limit allowance.
 *
 * Starts a new window if none exists or the previous one has expired. Once
 * {@link RATE_LIMIT_MAX_REQUESTS} is reached within the window, subsequent
 * calls return `false` until the window resets.
 *
 * @param ip - The client IP address to check.
 * @returns `true` if the request is allowed, `false` if the limit is exceeded.
 */
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

/** Periodically removes expired entries from {@link ipRateLimit} to prevent unbounded memory growth. */
setInterval(
	() => {
		const now = Date.now()
		for (const [key, value] of ipRateLimit) {
			if (now > value.resetAt) ipRateLimit.delete(key)
		}
	},
	60 * 60 * 1000
)

/**
 * Looks up the session in the database and attaches the associated user to
 * `event.locals`. Also updates the session's last-active timestamp.
 *
 * Sets `event.locals.user` to `undefined` if the session is not found.
 *
 * @param sessionId - The session UUID read from the request cookie.
 * @param event - The SvelteKit request event to attach the user to.
 */
async function attachUserToRequestEvent(sessionId: string, event: RequestEvent) {
	const result = await query(
		'SELECT get_and_update_session($1::uuid)',
		[sessionId],
		'get-and-update-session'
	)
	event.locals.user = result.rows[0]?.get_and_update_session // undefined if not found
}

/**
 * SvelteKit server hook — invoked for every request before the endpoint or
 * page load function runs.
 *
 * Responsibilities:
 * - Short-circuits static asset requests (`/_app/`) immediately.
 * - Enforces IP-based rate limiting on sensitive auth paths.
 * - Resolves the session cookie to a user and populates `event.locals.user`.
 * - Deletes a stale session cookie when no matching session is found.
 */
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
