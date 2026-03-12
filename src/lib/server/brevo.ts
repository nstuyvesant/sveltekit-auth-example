// See https://developers.brevo.com/reference/sendtransacemail
import { env } from '$env/dynamic/private'

/**
 * Delays execution for the specified number of milliseconds.
 * @param ms - The number of milliseconds to delay.
 * @returns A promise that resolves after the specified delay.
 */
async function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculates an exponential backoff delay with jitter for retry attempts.
 * Formula: 1000ms * 2^(attempt - 1) + random(0-500ms)
 * Example delays: attempt 1 = 1000-1500ms, attempt 2 = 2000-2500ms, attempt 3 = 4000-4500ms
 * @param attempt - The retry attempt number (1-based).
 * @returns The backoff delay in milliseconds with added jitter.
 */
function getBackoffDelay(attempt: number) {
	// attempt: 1, 2, 3 -> 1000, 2000, 4000 (plus jitter)
	const base = 1000
	const exponential = base * 2 ** (attempt - 1)
	const jitter = Math.random() * 500 // 0-500ms jitter
	return exponential + jitter
}

/**
 * Type guard to check if the response data is a Brevo error response.
 * @param data - The response data to check.
 * @returns True if the data is a BrevoErrorResponse.
 */
function isBrevoError(data: unknown): data is BrevoErrorResponse {
	return typeof data === 'object' && data !== null && 'code' in data
}

/**
 * Validates that an email message has all required fields.
 * @param message - The email message to validate.
 * @throws {Error} If any required field is missing or invalid.
 */
function validateMessage(message: EmailMessageBrevo): void {
	if (!message.sender) {
		throw new Error('Email message is missing sender')
	}
	if (!message.to || message.to.length === 0) {
		throw new Error('Email message is missing recipients')
	}
	if (!message.subject) {
		throw new Error('Email message is missing subject')
	}
	if (!message.htmlContent && !message.textContent) {
		throw new Error('Email message is missing content (htmlContent or textContent required)')
	}
}

/**
 * Sends an email message via the Brevo API with automatic retry logic.
 * Implements exponential backoff with jitter for transient failures (429, 5xx errors).
 * Validates message fields and throws errors for missing required data or non-retriable failures.
 *
 * @param message - The email message object containing sender, recipients, subject, and content.
 * @throws {Error} If BREVO_KEY is missing, message validation fails, or sending fails after all retry attempts.
 * @returns A promise that resolves when the email is successfully sent (HTTP 201).
 *
 * @remarks
 * - Retries up to 4 times (1 initial attempt + 3 retries) for network errors and retriable HTTP errors.
 * - Uses 30-second timeout per request.
 * - Respects Retry-After header from rate limit responses.
 * - Logs warnings for retriable failures and errors for permanent failures.
 */
export async function sendMessage(message: EmailMessageBrevo): Promise<void> {
	if (!env.BREVO_KEY) {
		throw new Error('Brevo API key is missing from environment variables')
	}

	validateMessage(message)

	const maxAttempts = 4 // initial try + 3 retries
	const recipients = message.to.map(r => r.email).join(', ')

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		let response: Response

		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

			response = await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					'api-key': env.BREVO_KEY
				},
				body: JSON.stringify(message),
				signal: controller.signal
			})

			clearTimeout(timeoutId)
		} catch (error) {
			if (attempt === maxAttempts) {
				console.error('Brevo send failed after retries (network error)', {
					error,
					subject: message.subject,
					to: recipients
				})
				throw new Error('Failed to send email after retries', { cause: error })
			}

			const wait = getBackoffDelay(attempt)
			console.warn(
				`Brevo send network error (attempt ${attempt}) — retrying in ${Math.round(wait)}ms`,
				{
					error,
					subject: message.subject
				}
			)
			await delay(wait)
			continue
		}

		if (response.status === 201) {
			return // Success - email sent
		}

		// Handle 400 bad request errors with code property
		if (response.status === 400) {
			const body = await response.json().catch(() => null)
			const errorCode = isBrevoError(body) ? body.code : undefined
			console.error('Brevo send failed (bad request)', {
				status: response.status,
				code: errorCode,
				body,
				subject: message.subject,
				to: recipients
			})
			throw new Error(`Failed to send email: ${errorCode || 'Bad request'}`)
		}

		const retriable = response.status === 429 || (response.status >= 500 && response.status <= 599)

		if (!retriable || attempt === maxAttempts) {
			const body = await response.json().catch(() => null)
			console.error('Brevo send failed (no more retries)', {
				status: response.status,
				statusText: response.statusText,
				body,
				subject: message.subject,
				to: recipients
			})
			throw new Error(`Failed to send email: ${response.status} ${response.statusText}`)
		}

		// Check for Retry-After header and use it if available
		const retryAfterHeader = response.headers.get('Retry-After')
		let retryAfter: number | null = null

		if (retryAfterHeader) {
			const parsed = parseInt(retryAfterHeader, 10)
			// If it's a valid number, treat as seconds; otherwise it might be an HTTP date
			if (!isNaN(parsed)) {
				retryAfter = parsed * 1000
			}
		}

		const wait = retryAfter || getBackoffDelay(attempt)

		console.warn(`Brevo send failed (attempt ${attempt}) — retrying in ${Math.round(wait)}ms`, {
			status: response.status,
			statusText: response.statusText,
			subject: message.subject,
			retryAfter: retryAfter ? `${retryAfter}ms (from header)` : undefined
		})
		await delay(wait)
	}

	throw new Error('Unexpected Brevo retry logic failure')
}
