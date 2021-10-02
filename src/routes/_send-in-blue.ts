const { VITE_SEND_IN_BLUE_KEY, VITE_SEND_IN_BLUE_URL, VITE_EMAIL_FROM } = import.meta.env

// POST or PUT submission to SendInBlue
const submit = async (method, url, data) => {
  const response: Response = await fetch(`${VITE_SEND_IN_BLUE_URL}${url}`, {
    method,
    headers: {
      'Accept': 'application/json', // Probably not needed
      'Content-Type': 'application/json',
      'api-key': <string> VITE_SEND_IN_BLUE_KEY
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    console.error('Error from SendInBlue:', response)
    throw new Error(`Error communicating with SendInBlue.`)
  }
}

const sender: MessageAddressee = <MessageAddressee> JSON.parse(<string> VITE_EMAIL_FROM)

type SendMessageResponse = (message: Message) => Promise<void>
export const sendMessage: SendMessageResponse = async (message: Message) => submit('POST', '/v3/smtp/email', { ...message, sender })
