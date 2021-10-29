import dotenv from 'dotenv'
import type { RequestHandler } from '@sveltejs/kit'
import type  { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { query } from '../../_db'

dotenv.config()

const JWT_SECRET = process.env['JWT_SECRET']

export const put: RequestHandler<unknown, Required<{ token: string, password: string }>> = async ({body}) => {
  const { token, password } = body

  // Check the validity of the token and extract userId
  try {
    const decoded = <JwtPayload> jwt.verify(token, JWT_SECRET)
    const userId = decoded.subject

    // Update the database with the new password
    const sql = `CALL reset_password($1, $2);`
    await query(sql, [userId, password])

    return {
      status: 200,
      body: {
        message: 'Password successfully reset.'
      }
    }
  } catch (error) {
    // Technically, I should check error.message to make sure it's not a DB issue
    return {
      status: 403,
      body: {
        message: 'Password reset token expired.'
      }
    }
  }
}
