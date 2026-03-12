/* eslint-disable @typescript-eslint/no-explicit-any */

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	/** Per-request server-side locals populated by `hooks.server.ts`. */
	interface Locals {
		/** The authenticated user, or `undefined` when no valid session exists. */
		user: User | undefined
	}

	// interface Platform {}

	/** Private environment variables (server-side only). */
	interface PrivateEnv {
		// $env/static/private
		/** PostgreSQL connection string. */
		DATABASE_URL: string
		/** Public-facing domain used to construct email links (e.g. `https://example.com`). */
		DOMAIN: string
		/** Secret key used to sign and verify JWTs. */
		JWT_SECRET: string
		/** SendGrid API key. */
		SENDGRID_KEY: string
		/** Default sender email address for outgoing mail. */
		SENDGRID_SENDER: string
	}

	/** Public environment variables (safe to expose to the client). */
	interface PublicEnv {
		// $env/static/public
		/** Google OAuth 2.0 client ID for Google Sign-In. */
		PUBLIC_GOOGLE_CLIENT_ID: string
	}
}

/** Result returned by the `authenticate` and `register` SQL functions. */
interface AuthenticationResult {
	/** HTTP status code to use when the operation fails. */
	statusCode: NumericRange<400, 599>
	/** Human-readable status message. */
	status: string
	/** The authenticated or registered user, if successful. */
	user: User
	/** The newly created session ID. */
	sessionId: string
}

/** Raw login credentials submitted by the user. */
interface Credentials {
	email: string
	password: string
}

/** Persistent properties stored in the database for a user account. */
interface UserProperties {
	id: number
	/** ISO-8601 datetime at which the current session expires. */
	expires?: string
	role: 'student' | 'teacher' | 'admin'
	password?: string
	firstName?: string
	lastName?: string
	email?: string
	phone?: string
}

/** A user record, or `undefined`/`null` when unauthenticated. */
type User = UserProperties | undefined | null

/** A database session paired with its associated user. */
interface UserSession {
	/** UUID session identifier stored in the `session` cookie. */
	id: string
	user: User
}
