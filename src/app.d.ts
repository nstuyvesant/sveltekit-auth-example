/* eslint-disable @typescript-eslint/no-explicit-any */

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	interface Locals {
    user: User
  }

	// interface Platform {}

  interface PrivateEnv { // $env/static/private
    DATABASE_URL: string
    DOMAIN: string
    JWT_SECRET: string
    SENDGRID_KEY: string
    SENDGRID_SENDER: string
  } 

	interface PublicEnv { // $env/static/public
    PUBLIC_GOOGLE_CLIENT_ID: string
  }
}

interface AuthenticationResult {
  statusCode: NumericRange<400, 599>
  status: string
  user: User
  sessionId: string
}

interface Credentials {
  email: string
  password: string
}

interface UserProperties {
  id: number
  expires?: string // ISO-8601 datetime
  role: 'student' | 'teacher' | 'admin'
  password?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

type User = UserProperties | undefined | null

interface UserSession {
  id: string,
  user: User
}
