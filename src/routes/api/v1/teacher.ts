import type { RequestHandler } from '@sveltejs/kit'

export const get: RequestHandler = async event=> {
  const authorized = ['admin', 'teacher']

  if (!event.locals.user || !authorized.includes(event.locals.user.role)) {
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