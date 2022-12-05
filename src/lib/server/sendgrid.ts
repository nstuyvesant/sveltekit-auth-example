import type { MailDataRequired } from '@sendgrid/mail'
import sgMail from '@sendgrid/mail'
import { env } from '$env/dynamic/private'

export const sendMessage = async (message: Partial<MailDataRequired>) => {
  const { SENDGRID_SENDER, SENDGRID_KEY } = env
  try {
    sgMail.setApiKey(SENDGRID_KEY)
    const completeMessage = <MailDataRequired> {
      from: SENDGRID_SENDER, // default sender can be altered
      ...message
    }
    await sgMail.send(completeMessage)
  } catch (errSendingMail) {
    console.error(errSendingMail)
  }
}
