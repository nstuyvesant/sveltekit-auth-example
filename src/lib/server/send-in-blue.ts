import { SEND_IN_BLUE_KEY, SEND_IN_BLUE_URL, SEND_IN_BLUE_FROM, SEND_IN_BLUE_ADMINS } from '$env/static/private'

const sender = <MessageAddressee> JSON.parse(SEND_IN_BLUE_FROM || '')
const to = <MessageAddressee> JSON.parse(SEND_IN_BLUE_ADMINS || '')

// POST or PUT submission to SendInBlue
const submit = async (method: string, url: string, data: Partial<SendInBlueContact> | SendInBlueMessage) => {
  const response: Response = await fetch(`${SEND_IN_BLUE_URL}${url}`, <SendInBlueRequest> {
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

export const sendMessage = async (message: Message) => submit('POST', '/v3/smtp/email', { sender, to: [to], ...message })