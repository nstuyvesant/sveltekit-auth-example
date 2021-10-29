import dotenv from 'dotenv'

dotenv.config()

const SEND_IN_BLUE_KEY = process.env['SEND_IN_BLUE_KEY']
const SEND_IN_BLUE_URL = process.env['SEND_IN_BLUE_URL']
const SEND_IN_BLUE_FROM = <MessageAddressee> JSON.parse(process.env['SEND_IN_BLUE_FROM'])
const SEND_IN_BLUE_ADMINS = <MessageAddressee> JSON.parse(process.env['SEND_IN_BLUE_ADMINS'])

// POST or PUT submission to SendInBlue
const submit = async (method, url, data) => {
  const response: Response = await fetch(`${SEND_IN_BLUE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'api-key': SEND_IN_BLUE_KEY
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    console.error('Error from SendInBlue:', response)
    throw new Error(`Error communicating with SendInBlue.`)
  }
}

const sender = SEND_IN_BLUE_FROM
const to  = SEND_IN_BLUE_ADMINS

export const sendMessage = async (message: Message) => submit('POST', '/v3/smtp/email', { sender, to: [to], ...message })
