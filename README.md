# SvelteKit Authentication and Authorization Example

[![License](https://img.shields.io/github/license/nstuyvesant/sveltekit-auth-example)](https://github.com/nstuyvesant/sveltekit-auth-example/blob/master/LICENSE)
[![Node](https://img.shields.io/node/v/sveltekit-auth-example)](https://nodejs.org)
[![Svelte](https://img.shields.io/badge/Svelte-5-orange)](https://svelte.dev)

A complete, production-ready authentication and authorization starter for **Svelte 5** and **SvelteKit 2**. Skip the boilerplate — get secure local accounts, Google OAuth, MFA, email verification, role-based access control, and OWASP-compliant password hashing out of the box.

## Features

|                                                |                                         |
| ---------------------------------------------- | --------------------------------------- |
| ✅ Local accounts (email + password)           | ✅ Sign in with Google / Google One Tap |
| ✅ Multi-factor authentication (MFA via email) | ✅ Email verification                   |
| ✅ Forgot password / email reset (SendGrid)    | ✅ User profile management              |
| ✅ Session management + timeout                | ✅ Rate limiting                        |
| ✅ Role-based access control                   | ✅ Password complexity enforcement      |
| ✅ Content Security Policy (CSP)               | ✅ OWASP-compliant password hashing     |

## Stack

- **[SvelteKit](https://kit.svelte.dev)** — Single Page Application
- **[PostgreSQL 16+](https://www.postgresql.org)** — database with server-side hashing
- **[Tailwind CSS 4](https://tailwindcss.com)** — styling
- **TypeScript** — end-to-end type safety

## Requirements

- Node.js 24.14.0 or later
- PostgreSQL 16 or later
- A [SendGrid](https://sendgrid.com) account (for password reset emails)
- A [Google API client ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) (for Sign in with Google)

## Setting up the project

1. Get the project and set up the database

```bash
# Clone the repo to your current directory
git clone https://github.com/nstuyvesant/sveltekit-auth-example.git

# Install the dependencies
cd sveltekit-auth-example
yarn install

# Create PostgreSQL database (only works if you have PostgreSQL installed)
bash db_create.sh
```

2. Create a **Google API client ID** per [these instructions](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). Make sure you include `http://localhost:3000` and `http://localhost` in the Authorized JavaScript origins, and `http://localhost:3000/auth/google/callback` in the Authorized redirect URIs for your Client ID for Web application. **Do not access the site using http://127.0.0.1:3000** — use `http://localhost:3000` or it will not work.

3. [Create a free Twilio SendGrid account](https://signup.sendgrid.com) and generate an API Key following [this documentation](https://docs.sendgrid.com/ui/account-and-settings/api-keys) and add a sender as documented [here](https://docs.sendgrid.com/ui/sending-email/senders).

4. Create a **.env** file at the top level of the project with the following values (substituting your own id and PostgreSQL username and password):

```bash
DATABASE_URL=postgres://user:password@localhost:5432/auth
DATABASE_SSL=false
DOMAIN=http://localhost:3000
JWT_SECRET=replace_with_your_own
SENDGRID_KEY=replace_with_your_own
SENDGRID_SENDER=replace_with_your_own
PUBLIC_GOOGLE_CLIENT_ID=replace_with_your_own
```

## Run locally

```bash
# Start the dev server and open the app in a new browser tab
yarn dev -- --open
```

## Build and preview

```bash
# Build for production
yarn build

# Preview the production build
yarn preview
```

## Valid logins

The db_create.sql script adds three users to the database with obvious roles:

| Email               | Password   | Role    |
| ------------------- | ---------- | ------- |
| admin@example.com   | admin123   | admin   |
| teacher@example.com | teacher123 | teacher |
| student@example.com | student123 | student |

## How it works

The website supports two types of authentication:

1. **Local accounts** via username (email) and password
   - The login form (/src/routes/login/+page.svelte) sends the login info as JSON to endpoint /auth/login
   - The endpoint passes the JSON to PostgreSQL function authenticate(json) which hashes the password and compares it to the stored hashed password in the users table. The function returns JSON containing a session ID (v4 UUID) and user object (sans password).
   - The endpoint sends this session ID as an httpOnly SameSite cookie and the user object in the body of the response.
   - The client stores the user object in `appState` (see /src/lib/app-state.svelte.ts).
   - Further requests to the server include the session cookie. The hooks.ts handle() method extracts the session cookie, looks up the user and attaches it to RequestEvent.locals so server-side code can check locals.user.role to see if the request is authorized and return an HTTP 401 status if not.
2. **Sign in with Google**
   - **Sign in with Google** is initialized in /src/routes/+layout.svelte.
   - **Google One Tap** prompt is displayed on the initially loaded page unless [Intelligent Tracking Prevention is enabled in the browser](https://developers.google.com/identity/gsi/web/guides/features#upgraded_ux_on_itp_browsers).
   - **Sign in with Google** button is on the login page (/src/routes/login/+page.svelte) and register page (/src/routes/register/+page.svelte).
   - Clicking either button opens a new window asking the user to authorize this website. If the user OKs it, a JSON Web Token (JWT) is sent to a callback function.
   - The callback function (in /src/lib/google.ts) sends the JWT to an endpoint on this server /auth/google.
   - The endpoint decodes and validates the user information then calls the PostgreSQL function start_gmail_user_session to upsert the user to the database returning a session id in an httpOnly SameSite cookie and user in the body of the response.
   - The client stores the user object in `appState` (see /src/lib/app-state.svelte.ts).
   - Further requests to the server work identically to local accounts above.

> There is some overhead to checking the user session in a database each time versus using a JWT; however, validating each request avoids problems discussed in [this article](https://redis.com/blog/json-web-tokens-jwt-are-dangerous-for-user-sessions/). For a high-volume website, I would use Redis or the equivalent.

The forgot password / password reset functionality uses a JWT and [**SendGrid**](https://www.sendgrid.com) to send the email. You would need to have a **SendGrid** account and set two environmental variables. Email sending is in /src/routes/auth/forgot/+server.ts. This code could easily be replaced by nodemailer or something similar. Note: I have no affiliation with **SendGrid** (used their API in another project).
