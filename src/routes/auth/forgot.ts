import type { RequestHandler } from '@sveltejs/kit'
import type { Secret } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { query } from '../_db'
import { sendMessage } from '../_send-in-blue'

const { VITE_WEB_URL } = import.meta.env

export const post: RequestHandler<{ email: string }, Partial<{ email: string }>> = async (request) => {
  const sql = `SELECT id as "userId" FROM users WHERE email = $1 LIMIT 1;`
  const { rows } = await query(sql, [request.body.email])

  if (rows.length > 0) {
    const { userId } = rows[0]
    // Create JWT with userId expiring in 30 mins
    const secret = <Secret> import.meta.env.VITE_JWT_SECRET
    const token = jwt.sign({ subject: userId }, secret, {
      expiresIn: '30m'
    })

    // Email URL with token to user
    const message: Message = {
      // sender: JSON.parse(<string> VITE_EMAIL_FROM),
      to: [{ email: request.body.email }],
      subject: 'Password reset',
      tags: ['account'],
      htmlContent: `
        <a href="${VITE_WEB_URL}/auth/reset/${token}">Reset my password</a>. Your browser will open and ask you to provide a
        new password with a confirmation then redirect you to your login page.
      `
    }
    sendMessage(message)
  }

  return {
    status: 204
  }
}