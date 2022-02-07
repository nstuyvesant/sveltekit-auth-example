import type { RequestHandler } from '@sveltejs/kit'

export const get: RequestHandler = async event => {
  const authorized = ['admin']

  if (!event.locals.user || !authorized.includes(event.locals.user.role)) {
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