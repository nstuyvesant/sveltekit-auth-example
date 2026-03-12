import { describe, it, expect } from 'vitest'

import { POST } from './+server'

const event = {} as Parameters<typeof POST>[0]

describe('POST /auth/[slug]', () => {
	it('throws 404 for any unrecognized auth path', async () => {
		await expect(POST(event)).rejects.toMatchObject({ status: 404 })
	})

	it('includes "Invalid endpoint" in the error message', async () => {
		await expect(POST(event)).rejects.toMatchObject({ body: { message: 'Invalid endpoint.' } })
	})
})
