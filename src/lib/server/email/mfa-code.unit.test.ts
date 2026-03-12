import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock $env/dynamic/private before importing the module under test
vi.mock('$env/dynamic/private', () => ({ env: { EMAIL: 'no-reply@example.com' } }))

// Mock the brevo sendMessage so no real HTTP calls are made
vi.mock('$lib/server/brevo', () => ({ sendMessage: vi.fn() }))

import { sendMfaCodeEmail } from './mfa-code'
import { sendMessage } from '$lib/server/brevo'

const mockSendMessage = vi.mocked(sendMessage)

describe('sendMfaCodeEmail', () => {
	beforeEach(() => {
		mockSendMessage.mockReset()
	})

	it('calls sendMessage with the correct recipient', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendMfaCodeEmail('user@example.com', '123456')

		expect(mockSendMessage).toHaveBeenCalledOnce()
		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.to).toEqual([{ email: 'user@example.com' }])
	})

	it('uses the EMAIL env var as the sender', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendMfaCodeEmail('user@example.com', '123456')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.sender).toEqual({ email: 'no-reply@example.com' })
	})

	it('sets the expected subject line', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendMfaCodeEmail('user@example.com', '123456')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.subject).toBe('Your login verification code')
	})

	it('includes the verification code in the HTML content', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendMfaCodeEmail('user@example.com', '048809')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.htmlContent).toContain('048809')
	})

	it('mentions the 10-minute expiry in the HTML content', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendMfaCodeEmail('user@example.com', '123456')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.htmlContent).toContain('10 minutes')
	})

	it('tags the message as account', async () => {
		mockSendMessage.mockResolvedValue(undefined)

		await sendMfaCodeEmail('user@example.com', '123456')

		const [msg] = mockSendMessage.mock.calls[0]
		expect(msg.tags).toContain('account')
	})

	it('propagates errors thrown by sendMessage', async () => {
		mockSendMessage.mockRejectedValue(new Error('Brevo API unavailable'))

		await expect(sendMfaCodeEmail('user@example.com', '123456')).rejects.toThrow(
			'Brevo API unavailable'
		)
	})
})
