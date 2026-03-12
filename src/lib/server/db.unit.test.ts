import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$env/dynamic/private', () => ({
	env: { DATABASE_URL: 'postgresql://localhost/test', DATABASE_SSL: 'false' }
}))

vi.mock('pg', () => {
	const mockPoolQuery = vi.fn()
	const mockPoolOn = vi.fn()
	const MockPool = vi.fn(function () {
		return { query: mockPoolQuery, on: mockPoolOn }
	})
	return { default: { Pool: MockPool } }
})

import pg from 'pg'
import { query } from './db'

// Retrieve the mock instance created during module initialisation
const poolInstance = vi.mocked(pg.Pool).mock.results[0].value
const mockPoolQuery = poolInstance.query as ReturnType<typeof vi.fn>
const mockPoolOn = poolInstance.on as ReturnType<typeof vi.fn>

describe('query', () => {
	beforeEach(() => {
		mockPoolQuery.mockReset()
	})

	it('creates a Pool with the DATABASE_URL connection string', () => {
		expect(pg.Pool).toHaveBeenCalledWith(
			expect.objectContaining({ connectionString: 'postgresql://localhost/test' })
		)
	})

	it('passes SQL and params to pool.query', async () => {
		mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 })

		await query('SELECT $1::text AS val', ['hello'])

		expect(mockPoolQuery).toHaveBeenCalledOnce()
		expect(mockPoolQuery).toHaveBeenCalledWith({
			text: 'SELECT $1::text AS val',
			values: ['hello']
		})
	})

	it('passes SQL without params to pool.query', async () => {
		mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 })

		await query('SELECT NOW()')

		expect(mockPoolQuery).toHaveBeenCalledWith({ text: 'SELECT NOW()', values: undefined })
	})

	it('uses a prepared statement object when a name is provided', async () => {
		mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 })

		await query('SELECT * FROM users WHERE id = $1', [42], 'get-user-by-id')

		expect(mockPoolQuery).toHaveBeenCalledWith({
			name: 'get-user-by-id',
			text: 'SELECT * FROM users WHERE id = $1',
			values: [42]
		})
	})

	it('does not include name in the query object when name is omitted', async () => {
		mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 })

		await query('SELECT 1', [])

		const [arg] = mockPoolQuery.mock.calls[0]
		expect(arg).not.toHaveProperty('name')
	})

	it('returns the QueryResult from pool.query', async () => {
		const fakeResult = { rows: [{ id: 1 }], rowCount: 1 }
		mockPoolQuery.mockResolvedValue(fakeResult)

		const result = await query('SELECT * FROM users WHERE id = $1', [1])

		expect(result).toBe(fakeResult)
	})

	it('propagates errors thrown by pool.query', async () => {
		mockPoolQuery.mockRejectedValue(new Error('connection refused'))

		await expect(query('SELECT 1')).rejects.toThrow('connection refused')
	})

	it('registers an error handler on the pool', () => {
		expect(mockPoolOn).toHaveBeenCalledWith('error', expect.any(Function))
	})
})
