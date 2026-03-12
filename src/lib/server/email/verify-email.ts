import { DOMAIN, SENDGRID_SENDER } from '$env/static/private'
import { sendMessage } from '$lib/server/sendgrid'

export const sendVerificationEmail = async (toEmail: string, token: string) => {
	await sendMessage({
		to: { email: toEmail },
		from: SENDGRID_SENDER,
		subject: 'Verify your email address',
		categories: ['account'],
		html: `
      <p>Thanks for registering! Please verify your email address by clicking the link below:</p>
      <p><a href="${DOMAIN}/auth/verify/${token}">Verify my email address</a></p>
      <p>This link expires in 24 hours. If you did not register, you can safely ignore this email.</p>
    `
	})
}
