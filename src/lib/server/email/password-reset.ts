import { DOMAIN, SENDGRID_SENDER } from '$env/static/private'
import { sendMessage } from '$lib/server/sendgrid'

/**
 * Sends a password reset email containing a link with a one-time reset token.
 *
 * @param toEmail - The recipient's email address.
 * @param token - The password reset token to embed in the reset link.
 */
export const sendPasswordResetEmail = async (toEmail: string, token: string) => {
	await sendMessage({
		to: { email: toEmail },
		from: SENDGRID_SENDER,
		subject: 'Password reset',
		categories: ['account'],
		html: `
      <p><a href="${DOMAIN}/auth/reset/${token}">Reset my password</a>. Your browser will open and ask you to
      provide a new password with a confirmation then redirect you to your login page.</p>
    `
	})
}
