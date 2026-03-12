import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({
	env: { EMAIL: 'no-reply@example.com', DOMAIN: 'https://example.com' }
}))

vi.mock('$lib/server/brevo', () => ({ sendMessage: vi.fn() }))

import { sendPasswordResetEmail } from './password-reset'
import { sendMessage } from '$lib/server/brevo'

const mockSendMessage = vi.mocked(sendMessage)

describe('sendPasswordResetEmail', () => {
	beforeEach(() => {
		mockSendMessage.mockReset()
	})

	it('calls sendMessage with the correct recipient', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendPasswordResetEmail('user@example.com', 'abc123')

		expect(mockSendMessage).toHaveBeenCalledOnce()
		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.to).toEqual([{ email: 'user@example.com' }])
	})

	it('uses the EMAIL env var as the sender', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendPasswordResetEmail('user@example.com', 'abc123')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.sender).toEqual({ email: 'no-reply@example.com' })
	})

	it('sets the expected subject line', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendPasswordResetEmail('user@example.com', 'abc123')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.subject).toBe('Password reset')
	})

	it('includes the reset link with DOMAIN and token in the HTML content', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendPasswordResetEmail('user@example.com', 'tok-xyz-789')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.htmlContent).toContain('https://example.com/auth/reset/tok-xyz-789')
	})

	it('tags the message as account', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendPasswordResetEmail('user@example.com', 'abc123')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.tags).toContain('account')
	})

	it('propagates errors thrown by sendMessage', async () => {
		mockSendMessage.mockRejectedValue(new Error('Brevo API unavailable'))

		await expect(sendPasswordResetEmail('user@example.com', 'abc123')).rejects.toThrow(
			'Brevo API unavailable'
		)
	})
})
