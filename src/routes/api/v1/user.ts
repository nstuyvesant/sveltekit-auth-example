import type { RequestHandler } from '@sveltejs/kit'
import { query } from '../../_db'

export const put: RequestHandler = async (request) => {
  const authorized = ['admin', 'teacher', 'student']

  if (!request.locals.user || !authorized.includes(request.locals.user.role)) {
    return {
      status: 401,
      body: {
        message: 'Unauthorized - must be logged-in.'
      }
    }
  }

  const sql = `CALL update_user($1, $2);`
  try {
    // Only permit update of the authenticated user
    await query(sql, [request.locals.user.id, JSON.stringify(request.body)])
  } catch (error) {
    return {
      status: 503,
      body: {
        message: 'Could not communicate with database.'
      }
    }
  }

  return {
    status: 200,
    body: {
      message: 'Successfully updated user profile.'
    }
  }
}