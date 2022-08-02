import type { RequestHandler } from '@sveltejs/kit'
import { query } from '../../_db'
import { requestAuthorized } from './_auth'

export const PUT: RequestHandler = async event => {
  if (!requestAuthorized(event, ['admin', 'teacher', 'student'])) {
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
    const body = await event.request.json()
    await query(sql, [event.locals.user.id, JSON.stringify(body)])
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