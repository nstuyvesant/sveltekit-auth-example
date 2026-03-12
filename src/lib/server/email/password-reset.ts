import { env } from '$env/dynamic/private'
import { sendMessage } from '$lib/server/brevo'

/**
 * Sends a password reset email containing a link with a one-time reset token.
 *
 * @param toEmail - The recipient's email address.
 * @param token - The password reset token to embed in the reset link.
 */
export const sendPasswordResetEmail = async (toEmail: string, token: string) => {
	await sendMessage({
		to: [{ email: toEmail }],
		sender: { email: env.EMAIL },
		subject: 'Password reset',
		tags: ['account'],
		htmlContent: `
      <p><a href="${env.DOMAIN}/auth/reset/${token}">Reset my password</a>. Your browser will open and ask you to
      provide a new password with a confirmation then redirect you to your login page.</p>
    `
	})
}
