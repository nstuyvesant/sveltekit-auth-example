/* eslint-disable @typescript-eslint/no-explicit-any */
import dotenv from 'dotenv'
import type { QueryResult} from 'pg'
import pg from 'pg'

dotenv.config()

const pgNativePool = new pg.native.Pool({
  max: 10, // default
  connectionString: process.env['DATABASE_URL'],
  ssl: {
    rejectUnauthorized: false
  }
})

type PostgresQueryResult = (sql: string, params?: any[]) => Promise<QueryResult<any>>
export const query: PostgresQueryResult = (sql, params?) => pgNativePool.query(sql, params)
