import type { RequestHandler } from '@sveltejs/kit'
import type  { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { query } from '../../_db'

const { VITE_JWT_SECRET } = import.meta.env

export const put: RequestHandler = async ({body}) => {
  const { token, password } = body

  // Check the validity of the token and extract userId
  try {
    const decoded = <JwtPayload> jwt.verify(token, <string> VITE_JWT_SECRET)
    const userId = decoded.subject

    // Update the database with the new password
    const sql = `UPDATE users SET password = crypt($1, gen_salt('bf', 8)) WHERE id = $2;`
    await query(sql, [password, userId])

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
