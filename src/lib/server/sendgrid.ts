import type { MailDataRequired } from '@sendgrid/mail'
import sgMail from '@sendgrid/mail'
import { env } from '$env/dynamic/private'

/**
 * Sends a transactional email via the SendGrid API.
 *
 * Merges the provided message with the default sender configured in the environment.
 * Any field in `message` (including `from`) will override the default.
 *
 * @param message - Partial SendGrid mail data. Must include at minimum `to`, `subject`, and `html` or `text`.
 * @throws {Error} If the SendGrid API key is missing or the API request fails.
 */
export const sendMessage = async (message: Partial<MailDataRequired>) => {
	const { SENDGRID_SENDER, SENDGRID_KEY } = env
	sgMail.setApiKey(SENDGRID_KEY)
	const completeMessage = <MailDataRequired>{
		from: SENDGRID_SENDER, // default sender can be altered
		...message
	}
	await sgMail.send(completeMessage)
}
