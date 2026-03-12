import { EMAIL } from '$env/static/private'
import { sendMessage } from '$lib/server/brevo'

/**
 * Sends a multi-factor authentication (MFA) verification code email to the user.
 *
 * @param toEmail - The recipient's email address.
 * @param code - The one-time verification code to include in the email.
 */
export const sendMfaCodeEmail = async (toEmail: string, code: string) => {
	await sendMessage({
		to: [{ email: toEmail }],
		sender: { email: EMAIL },
		subject: 'Your login verification code',
		tags: ['account'],
		htmlContent: `
      <p>Your verification code is:</p>
      <p style="font-size: 2em; font-weight: bold; letter-spacing: 0.25em;">${code}</p>
      <p>This code expires in 10 minutes. If you did not attempt to log in, you can safely ignore this email.</p>
    `
	})
}
