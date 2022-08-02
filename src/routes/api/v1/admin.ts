import type { RequestHandler } from '@sveltejs/kit'
import { requestAuthorized } from './_auth'

export const GET: RequestHandler = async event => {
  if (!requestAuthorized(event, ['admin'])) {
    return {
      status: 401,
      body: {
        message: 'Unauthorized - admin role required.'
      }
    }
  }

  return {
    status: 200,
    body: {
      message: 'Admin-only content from endpoint.'
    }
  }
}