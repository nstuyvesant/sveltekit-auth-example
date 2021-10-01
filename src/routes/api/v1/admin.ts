import type { RequestHandler } from '@sveltejs/kit'

export const get: RequestHandler = async (request) => {
  const authorized = ['admin']

  if (!request.locals.user || !authorized.includes(request.locals.user.role)) {
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