# SvelteKit Authentication and Authorization Example

This is an example of how to register, authenticate, and update users and limit their access to
areas of the website by role (admin, teacher, student).

It's an SPA built with SvelteKit and a PostgreSQL database back-end. It's coded in TypeScript and the website is styled using Bootstrap.

The website supports two types of authentication:
1. Local accounts via username (email) and password
  - The login form (/src/routes/login.svelte) sends the login info as JSON to endpoint /auth/login
  - The endpoint passes the JSON to PostgreSQL function authenticate(json) which hashes the password and compares it to the stored hashed password in the users table. The function returns JSON containing a session ID (v4 UUID) and user object (sans password).
  - The endpoint sends session ID as an httpOnly SameSite cookie and the user object in the body of the response.
  - The client stores the user object in SvelteKit's session store.
2. Sign in with Google
  - **Sign in with Google** is initialized in /src/routes/__layout.svelte.
  - **One Tap** "dialog" is displayed on the Home page (/src/routes/index.svelte) while the **Sign in with Google** button is on the login page (/src/routes/login.svelte).
  - Clicking either button opens a new window asking the user to authorize this website. If they OK it, a JWT is sent to a callback function.
  - The callback function (in /src/lib/auth.ts) sends the JWT to an endpoint on this server /auth/google.
  - The endpoint decodes and validates the user information then calls the PostgreSQL function start_gmail_user_session to upsert the user to the database returing a session id in an httpOnly SameSite cookie and user in the body of the response.
  - The client stores the user object in SvelteKit's session store.

As the client calls endpoints, each request to the server includes the session ID in the httpOnly cookie. The handle() function in hooks.ts checks the database for this session ID. If it exists and is not expired, it attaches the user (including role) to request.locals. Each endpoint can then examine request.locals.user.role to determine whether to respond or return a 403.

Pages use the session.user.role to determine whether they are authorized. While a malicious user could alter the client-side session, the data populated on restricted pages is served via endpoints which are secured server-side.

## Prerequisites
- PostgreSQL 13 or higher
- pgAdmin 5.7 or higher
- Node.js 16.10.0 or higher
- npm 7.24.1 or higher

## Setting up the project

Here are the steps using a macOS, Linux or UNIX command-line:

1. Get the project and setup the database
```bash
# Clone the repo to your current directory
git clone https://github.com/nstuyvesant/sveltekit-auth-example.git

# Install the dependencies
cd /sveltekit-auth-example
npm install

# Create the database from command-line (or use pgAdmin)
psql -d postgres -f db_create.sql
```

2. Create a Google API client ID per [these instructions](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

3. Create an .env file at the top level of the project with the following values:
```bash
VITE_GOOGLE_CLIENT_ID=REPLACE_WITH_WHAT_YOU_GOT_FROM_STEP_2_ABOVE
VITE_DATABASE_URL=postgres://auth@localhost:5432/auth
```
> Modify the database URL if you add a password to the auth user (eg "auth@" -> "auth:WHATEVER_PASSWORD_YOU_USE@")

## Run locally

```bash
# Start the server and open the app in a new browser tab
npm run dev -- --open
```

## Valid logins

The db_create.sql script adds three users to the database:
- admin@example.com password admin
- teacher@example.com password teacher
- student@example.com password student
