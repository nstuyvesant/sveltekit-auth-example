import { json as json$1 } from '@sveltejs/kit';
import dotenv from 'dotenv'
import type { RequestHandler } from '@sveltejs/kit'
import type  { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { query } from '../../_db'

dotenv.config()

const JWT_SECRET =  <jwt.Secret> process.env.JWT_SECRET

export const PUT: RequestHandler = async event => {
  const body = await event.request.json()
  const { token, password } = body

  // Check the validity of the token and extract userId
  try {
    const decoded = <JwtPayload> jwt.verify(token, JWT_SECRET)
    const userId = decoded.subject

    // Update the database with the new password
    const sql = `CALL reset_password($1, $2);`
    await query(sql, [userId, password])

    return json$1({
  message: 'Password successfully reset.'
})
  } catch (error) {
    // Technically, I should check error.message to make sure it's not a DB issue
    return json$1({
  message: 'Password reset token expired.'
}, {
      status: 403
    })
  }
}
