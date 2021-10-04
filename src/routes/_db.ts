/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryResult} from 'pg'
import pg from 'pg'

const pgNativePool = new pg.native.Pool({
  max: 10, // default
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

type QueryResponse = (sql: string, params?: any[]) => Promise<QueryResult<any>>
export const query: QueryResponse = (sql, params?) => pgNativePool.query(sql, params)
