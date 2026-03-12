import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock $env/dynamic/private before importing the module under test
vi.mock('$env/dynamic/private', () => ({ env: { BREVO_KEY: 'test-key' } }))

import { sendMessage } from './brevo'

// Minimal valid message used across tests
const validMessage: App.EmailMessageBrevo = {
	to: [{ email: 'user@example.com' }],
	sender: { email: 'no-reply@example.com' },
	subject: 'Hello',
	htmlContent: '<p>Hello</p>'
}

// Helper to build a mock Response
function mockResponse(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...headers }
	})
}

describe('sendMessage', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		// Default: fake timers off; individual tests opt in with vi.useFakeTimers()
	})

	// ── Validation ──────────────────────────────────────────────────────────

	it('throws if BREVO_KEY is missing', async () => {
		vi.doMock('$env/dynamic/private', () => ({ env: {} }))
		// Re-import to pick up the new mock
		const { sendMessage: sm } = await import('./brevo?nocache-1')
		await expect(sm(validMessage)).rejects.toThrow('Brevo API key is missing')
	})

	it('throws if sender is missing', async () => {
		const msg = { ...validMessage, sender: undefined as unknown as App.EmailAddress }
		await expect(sendMessage(msg)).rejects.toThrow('missing sender')
	})

	it('throws if to is empty', async () => {
		const msg = { ...validMessage, to: [] }
		await expect(sendMessage(msg)).rejects.toThrow('missing recipients')
	})

	it('throws if subject is missing', async () => {
		const msg = { ...validMessage, subject: '' }
		await expect(sendMessage(msg)).rejects.toThrow('missing subject')
	})

	it('throws if both htmlContent and textContent are absent', async () => {
		const { htmlContent: _, ...msg } = validMessage
		await expect(sendMessage(msg)).rejects.toThrow('missing content')
	})

	it('accepts a message with only textContent', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(201))
		const { htmlContent: _, ...msg } = validMessage
		await sendMessage({ ...msg, textContent: 'plain text' })
		expect(fetchSpy).toHaveBeenCalledOnce()
	})

	// ── Success ──────────────────────────────────────────────────────────────

	it('resolves without error on HTTP 201', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(201))
		await expect(sendMessage(validMessage)).resolves.toBeUndefined()
	})

	it('sends a POST to the Brevo smtp endpoint', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(201))
		await sendMessage(validMessage)
		const [url, init] = fetchSpy.mock.calls[0]
		expect(url).toBe('https://api.brevo.com/v3/smtp/email')
		expect((init as RequestInit).method).toBe('POST')
	})

	it('includes the api-key header', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(201))
		await sendMessage(validMessage)
		const [, init] = fetchSpy.mock.calls[0]
		expect((init as RequestInit).headers).toMatchObject({ 'api-key': 'test-key' })
	})

	it('serialises the message as JSON in the request body', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(201))
		await sendMessage(validMessage)
		const [, init] = fetchSpy.mock.calls[0]
		expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
			subject: 'Hello',
			to: [{ email: 'user@example.com' }]
		})
	})

	// ── 400 Bad Request ──────────────────────────────────────────────────────

	it('throws immediately on 400 with a Brevo error code', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			mockResponse(400, { code: 'invalid_parameter', message: 'Bad value' })
		)
		await expect(sendMessage(validMessage)).rejects.toThrow('invalid_parameter')
	})

	it('throws immediately on 400 without a code', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(400, {}))
		await expect(sendMessage(validMessage)).rejects.toThrow('Bad request')
	})

	// ── Non-retriable errors ─────────────────────────────────────────────────

	it('throws immediately on a 401 response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(401, {}, {}))
		await expect(sendMessage(validMessage)).rejects.toThrow('401')
	})

	// ── Retry logic ──────────────────────────────────────────────────────────

	it('retries on 429 and succeeds on the next attempt', async () => {
		vi.useFakeTimers()
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(mockResponse(429, {}, { 'Retry-After': '0' }))
			.mockResolvedValueOnce(mockResponse(201))

		const promise = sendMessage(validMessage)
		await vi.runAllTimersAsync()
		await expect(promise).resolves.toBeUndefined()
		expect(fetchSpy).toHaveBeenCalledTimes(2)
		vi.useRealTimers()
	})

	it('retries on 500 and succeeds on the next attempt', async () => {
		vi.useFakeTimers()
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(mockResponse(500))
			.mockResolvedValueOnce(mockResponse(201))

		const promise = sendMessage(validMessage)
		await vi.runAllTimersAsync()
		await expect(promise).resolves.toBeUndefined()
		expect(fetchSpy).toHaveBeenCalledTimes(2)
		vi.useRealTimers()
	})

	it('throws after exhausting all 4 attempts on persistent 500', async () => {
		vi.useFakeTimers()
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(500))

		const rejection = expect(sendMessage(validMessage)).rejects.toThrow('500')
		await vi.runAllTimersAsync()
		await rejection
		vi.useRealTimers()
	})

	it('retries on network error and throws after 4 attempts', async () => {
		vi.useFakeTimers()
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network failure'))

		const rejection = expect(sendMessage(validMessage)).rejects.toThrow('Failed to send email after retries')
		await vi.runAllTimersAsync()
		await rejection
		vi.useRealTimers()
	})

	it('uses the Retry-After header delay on 429', async () => {
		vi.useFakeTimers()
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(mockResponse(429, {}, { 'Retry-After': '2' }))
			.mockResolvedValueOnce(mockResponse(201))

		const promise = sendMessage(validMessage)
		// Advance only 1999ms — should still be waiting
		await vi.advanceTimersByTimeAsync(1999)
		expect(fetchSpy).toHaveBeenCalledTimes(1)
		// Advance past the 2000ms threshold
		await vi.advanceTimersByTimeAsync(1)
		await promise
		expect(fetchSpy).toHaveBeenCalledTimes(2)
		vi.useRealTimers()
	})
})
