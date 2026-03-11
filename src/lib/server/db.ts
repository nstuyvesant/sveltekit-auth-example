import type { QueryResult, QueryResultRow } from 'pg'
import pg from 'pg'
import { env } from '$env/dynamic/private'

/**
 * Generic function signature for executing a typed SQL query.
 *
 * @template T The row type returned from the database, extending QueryResultRow.
 * @param sql The parameterized SQL query string.
 * @param params Optional positional parameters to bind to the query.
 * @returns A promise resolving to the typed QueryResult.
 */
type QueryFunction = <T extends QueryResultRow>(
	sql: string,
	params?: (string | number | boolean | object | null)[]
) => Promise<QueryResult<T>>

let queryFn: QueryFunction

const pool = new pg.Pool({
	max: 10, // default
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
	connectionString: env.DATABASE_URL,
	ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
})

pool.on('error', (err: Error) => {
	console.error('Unexpected error on idle client', err)
})

queryFn = <T extends QueryResultRow>(
	sql: string,
	params?: (string | number | boolean | object | null)[]
) => pool.query<T>(sql, params)

/**
 * Executes a parameterized SQL query against the PostgreSQL database.
 *
 * @template T - The expected shape of rows returned by the query. Must extend QueryResultRow.
 * @param sql - The SQL query string. Use $1, $2, etc. for parameterized queries.
 * @param params - Optional array of parameter values to bind to the query placeholders.
 * @returns A Promise resolving to a PostgreSQL QueryResult containing typed rows and metadata.
 * @throws {Error} If the database connection fails or the query is invalid.
 *
 * @example
 * ```typescript
 * // Simple query without parameters
 * const result = await query('SELECT * FROM users');
 * console.log(result.rows);
 *
 * // Parameterized query with type safety
 * const result = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
 * console.log(result.rows[0].name); // TypeScript knows this is a User
 *
 * // Insert with multiple parameters
 * await query(
 *   'INSERT INTO products (name, price) VALUES ($1, $2)',
 *   ['Widget', 29.99]
 * );
 * ```
 */
export const query = <T extends QueryResultRow = any>(
	sql: string,
	params?: (string | number | boolean | object | null)[]
): Promise<QueryResult<T>> => queryFn<T>(sql, params)
