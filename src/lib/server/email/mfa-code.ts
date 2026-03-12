import { SENDGRID_SENDER } from '$env/static/private'
import { sendMessage } from '$lib/server/sendgrid'

export const sendMfaCodeEmail = async (toEmail: string, code: string) => {
	await sendMessage({
		to: { email: toEmail },
		from: SENDGRID_SENDER,
		subject: 'Your login verification code',
		categories: ['account'],
		html: `
      <p>Your verification code is:</p>
      <p style="font-size: 2em; font-weight: bold; letter-spacing: 0.25em;">${code}</p>
      <p>This code expires in 10 minutes. If you did not attempt to log in, you can safely ignore this email.</p>
    `
	})
}
