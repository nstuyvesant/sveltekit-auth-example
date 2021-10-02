// Create JWT with user_id for 24 hours
// Send email via SendInBlue with URL
// http://localhost:3000/auth/reset/[JWT]
import type { RequestHandler } from '@sveltejs/kit'
import jwt from 'jsonwebtoken'
import { query } from '../_db'

export const post: RequestHandler = async (request) => {
  const sql = `SELECT id as "userId" FROM users WHERE email = $1 LIMIT 1;`
  const { rows } = await query(sql, [request.body.email])

  if (rows.length > 0) {
    const { userId } = rows[0]
    // Create JWT with userId expiring in 30 mins
    const secret = import.meta.env.VITE_JWT_SECRET
    const token = jwt.sign({ subject: userId }, secret, {
      expiresIn: '30m'
    })

    // Email token to user
  }

  return {
    status: 204
  }
}