/* eslint-disable @typescript-eslint/no-explicit-any */

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare global {
	declare namespace App {
		/** Per-request server-side locals populated by `hooks.server.ts`. */
		interface Locals {
			/** The authenticated user, or `undefined` when no valid session exists. */
			user: User | undefined
		}

		// interface Platform {}

		/** Error response returned by the Brevo email API. */
		interface BrevoErrorResponse {
			/** Optional machine‑readable error code. */
			code?: string
			/** Human‑readable error message. */
			message?: string
		}

		/** Successful response returned by the Brevo email API. */
		interface BrevoSuccessResponse {
			/** Message identifier assigned by Brevo. */
			messageId: string
		}

		/** Basic email address with optional display name. */
		interface EmailAddress {
			/** Email address string. */
			email: string
			/** Optional display name associated with the address. */
			name?: string
		}

		/** Payload used when sending email via Brevo. */
		interface EmailMessageBrevo {
			/** Primary recipients. */
			to: EmailAddress[]
			/** Carbon‑copy recipients. */
			cc?: EmailAddress[]
			/** Blind carbon‑copy recipients. */
			bcc?: EmailAddress[]
			/** Sender address. */
			sender: EmailAddress
			/** Optional reply‑to address. */
			replyTo?: EmailAddress
			/** Subject line for the email. */
			subject: string
			/** Additional SMTP or provider‑specific headers. */
			headers?: Record<string, string>
			/** Tag names applied to the message. */
			tags?: string[]
			/** HTML content of the email. */
			htmlContent?: string
			/** Plain‑text content of the email. */
			textContent?: string
			/** Attachments encoded as base64 strings. */
			attachment?: Array<{ content: string; name: string }>
		}

		/** Private environment variables (server-side only). */
		interface PrivateEnv {
			// $env/static/private
			/** PostgreSQL connection string. */
			DATABASE_URL: string
			/** Public-facing domain used to construct email links (e.g. `https://example.com`). */
			DOMAIN: string
			/** Secret key used to sign and verify JWTs. */
			JWT_SECRET: string
			/** Brevo (Sendinblue) API key. */
			BREVO_KEY: string
			/** Default sender email address for outgoing mail. */
			EMAIL: string
			/** Cloudflare Turnstile secret key used to verify challenge tokens server-side. */
			TURNSTILE_SECRET_KEY: string
		}

		/** Public environment variables (safe to expose to the client). */
		interface PublicEnv {
			// $env/static/public
			/** Google OAuth 2.0 client ID for Google Sign-In. */
			PUBLIC_GOOGLE_CLIENT_ID: string
			/** Cloudflare Turnstile site key rendered in the browser widget. */
			PUBLIC_TURNSTILE_SITE_KEY: string
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

	interface Window {
		turnstile?: {
			render: (container: HTMLElement, options: Record<string, unknown>) => string
			reset: (widgetId: string) => void
			remove: (widgetId: string) => void
		}
	}
}

export {}
