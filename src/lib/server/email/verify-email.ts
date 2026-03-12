import { DOMAIN, EMAIL } from '$env/static/private'
import { sendMessage } from '$lib/server/brevo'

/**
 * Sends an email verification link to a newly registered user.
 *
 * @param toEmail - The recipient's email address.
 * @param token - The email verification token to embed in the verification link.
 */
export const sendVerificationEmail = async (toEmail: string, token: string) => {
	await sendMessage({
		to: [{ email: toEmail }],
		sender: { email: EMAIL },
		subject: 'Verify your email address',
		tags: ['account'],
		htmlContent: `
      <p>Thanks for registering! Please verify your email address by clicking the link below:</p>
      <p><a href="${DOMAIN}/auth/verify/${token}">Verify my email address</a></p>
      <p>This link expires in 24 hours. If you did not register, you can safely ignore this email.</p>
    `
	})
}
