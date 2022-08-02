import type { RequestHandler } from '@sveltejs/kit'
import { requestAuthorized } from './_auth'

export const GET: RequestHandler = async event=> {
  if (!requestAuthorized(event, ['admin', 'teacher'])) {
    return {
      status: 401,
      body: {
        message: 'Unauthorized - admin or teacher role required.'
      }
    }
  }

  return {
    status: 200,
    body: {
      message: 'Teachers or Admin-only content from endpoint.'
    }
  }
}