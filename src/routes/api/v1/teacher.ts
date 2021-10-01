import type { RequestHandler } from '@sveltejs/kit'

export const get: RequestHandler = async (request) => {
  const authorized = ['admin', 'teacher']

  if (!request.locals.user || !authorized.includes(request.locals.user.role)) {
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