import type { RequestHandler } from '@sveltejs/kit'
import { query } from '../_db'

export const post: RequestHandler = async (request) => {
  const { body } = request
  const { slug } = request.params

  let result
  let sql

  try {
    switch (slug) {
      case 'login': 
        sql = `SELECT response FROM authenticate($1);`
        break
      case 'register':
        sql = `SELECT response FROM register($1);`
        break
      case 'logout':
        return {
          status: 200,
          headers: {
            'Set-Cookie': `session=; Path=/; SameSite=Lax; HttpOnly; Expires=${new Date().toUTCString()}`
          },
          body: {
            message: 'Logout successful.'
          }
        }
      default:
        return {
          status: 404,
          body: {
            message: 'Invalid endpoint.',
            user: null
          }
        }
    }
    result = await query(sql, [JSON.stringify(body)])
  } catch (error) {
    return {
      status: 503,
      body: {
        message: 'Could not communicate with database.',
        user: null
      }
    }
  }

  const { response } = result.rows[0]
  if (!response.user) {
    return {
      status: response.statusCode,
      body: {
        message: response.status,
        user: null,
        sessionId: null
      }
    }
  }

  // prevent hooks.ts handle() from deleting cookie we just set
  request.locals.user = response.user

  return {
    status: response.statusCode,
    headers: { // database expires sessions in 2 hours
      'Set-Cookie': `session=${response.sessionId}; Path=/; SameSite=Lax; HttpOnly;`
    },
    body: {
      message: response.status,
      user: response.user,
    }
  }
}