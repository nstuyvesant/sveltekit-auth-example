import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({ env: { EMAIL: 'no-reply@example.com', DOMAIN: 'https://example.com' } }))

vi.mock('$lib/server/brevo', () => ({ sendMessage: vi.fn() }))

import { sendVerificationEmail } from './verify-email'
import { sendMessage } from '$lib/server/brevo'

const mockSendMessage = vi.mocked(sendMessage)

describe('sendVerificationEmail', () => {
	beforeEach(() => {
		mockSendMessage.mockReset()
	})

	it('calls sendMessage with the correct recipient', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendVerificationEmail('new@example.com', 'tok-abc')

		expect(mockSendMessage).toHaveBeenCalledOnce()
		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.to).toEqual([{ email: 'new@example.com' }])
	})

	it('uses the EMAIL env var as the sender', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendVerificationEmail('new@example.com', 'tok-abc')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.sender).toEqual({ email: 'no-reply@example.com' })
	})

	it('sets the expected subject line', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendVerificationEmail('new@example.com', 'tok-abc')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.subject).toBe('Verify your email address')
	})

	it('includes the verification link with DOMAIN and token in the HTML content', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendVerificationEmail('new@example.com', 'tok-xyz-789')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.htmlContent).toContain('https://example.com/auth/verify/tok-xyz-789')
	})

	it('mentions the 24-hour expiry in the HTML content', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendVerificationEmail('new@example.com', 'tok-abc')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.htmlContent).toContain('24 hours')
	})

	it('tags the message as account', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendVerificationEmail('new@example.com', 'tok-abc')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.tags).toContain('account')
	})

	it('propagates errors thrown by sendMessage', async () => {
		mockSendMessage.mockRejectedValue(new Error('Brevo API unavailable'))

		await expect(sendVerificationEmail('new@example.com', 'tok-abc')).rejects.toThrow(
			'Brevo API unavailable'
		)
	})
})
