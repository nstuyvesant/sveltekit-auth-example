import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '$env/static/private'
import { query } from '$lib/server/db'

export const PUT: RequestHandler = async event => {
	const body = await event.request.json()
	const { token, password } = body

	// Check the validity of the token and extract userId
	try {
		const decoded = <JwtPayload>jwt.verify(token, <jwt.Secret>JWT_SECRET)
		const userId = decoded.subject

		// Update the database with the new password
		const sql = `CALL reset_password($1, $2);`
		await query(sql, [userId, password])

		return json({
			message: 'Password successfully reset.'
		})
	} catch (error) {
		// Technically, I should check error.message to make sure it's not a DB issue
		return json(
			{
				message: 'Password reset token expired.'
			},
			{
				status: 403
			}
		)
	}
}
