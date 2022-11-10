# SvelteKit Authentication and Authorization Example

This is an example of how to register, authenticate, and update users and limit their access to
areas of the website by role (admin, teacher, student). As almost every recent release of SvelteKit introduced breaking changes, this project attempts to
maintain compatibility with the latest release and leverage new APIs.

It's a Single Page App (SPA) built with SvelteKit and a PostgreSQL database back-end. Code is TypeScript and the website is styled using Bootstrap. PostgreSQL functions handle password hashing and UUID generation for the session ID. Unlike most authentication examples, this SPA does not use callbacks that redirect back to the site (causing the website to be reloaded with a visual flash).

The project includes a Content Security Policy (CSP) in svelte.config.js.

The website supports two types of authentication:
1. **Local accounts** via username (email) and password
   - The login form (/src/routes/login/+page.svelte) sends the login info as JSON to endpoint /auth/login
   - The endpoint passes the JSON to PostgreSQL function authenticate(json) which hashes the password and compares it to the stored hashed password in the users table. The function returns JSON containing a session ID (v4 UUID) and user object (sans password).
   - The endpoint sends this session ID as an httpOnly SameSite cookie and the user object in the body of the response.
   - The client stores the user object in the loginSession store.
   - Further requests to the server include the session cookie. The hooks.ts handle() method extracts the session cookie, looks up the user and attaches it to RequestEvent.locals so server-side code can check locals.user.role to see if the request is authorized and return an HTTP 401 status if not.
2. **Sign in with Google**
   - **Sign in with Google** is initialized in /src/routes/+layout.svelte.
   - **Google One Tap** prompt is displayed on the initially loaded page unless [Intelligent Tracking Prevention is enabled in the browser](https://developers.google.com/identity/gsi/web/guides/features#upgraded_ux_on_itp_browsers).
   - **Sign in with Google** button is on the login page (/src/routes/login/+page.svelte) and register page (/src/routes/register/+page.svelte).
   - Clicking either button opens a new window asking the user to authorize this website. If the user OKs it, a JSON Web Token (JWT) is sent to a callback function.
   - The callback function (in /src/lib/auth.ts) sends the JWT to an endpoint on this server /auth/google.
   - The endpoint decodes and validates the user information then calls the PostgreSQL function start_gmail_user_session to upsert the user to the database returing a session id in an httpOnly SameSite cookie and user in the body of the response.
   - The client stores the user object in the loginSession store.
   - Further requests to the server work identically to local accounts above.

> There is some overhead to checking the user session in a database each time versus using a JWT; however, validating each request avoids problems discussed in [this article](https://redis.com/blog/json-web-tokens-jwt-are-dangerous-for-user-sessions/) and [this one](https://scotch.io/bar-talk/why-jwts-suck-as-session-tokens). For a high-volume website, I would use Redis or the equivalent.

The forgot password / password reset functionality uses a JWT and [**SendInBlue**](https://www.sendinblue.com) to send the email. You would need to have a **SendInBlue** account and set three environmental variables. Email sending is in /src/routes/auth/forgot.ts. This code could easily be replaced by nodemailer or something similar. Note: I have no affliation with **SendInBlue** (used their API in another project).

## Prerequisites
- PostgreSQL 14.5 or higher
- Node.js 18.11.0 or higher
- npm 9.1.1 or higher
- Google API client
- SendInBlue account (only used for emailing password reset link - the sample can run without it but forgot password will not work)

## Setting up the project

Here are the steps:

1. Get the project and setup the database
```bash
# Clone the repo to your current directory
git clone https://github.com/nstuyvesant/sveltekit-auth-example.git

# Install the dependencies
cd /sveltekit-auth-example
npm install

# Create PostgreSQL database (only works if you installed PostgreSQL)
psql -d postgres -f db_create.sql
```

2. Create a **Google API client ID** per [these instructions](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). Make sure you include `http://localhost:3000`, `http://localhost` in the Authorized JavaScript origins and `http://localhost:3000/auth/google/callback` in the Authorized redirect URIs for your Client ID for Web application. ** Do not access the site using http://127.0.0.1:3000 ** - use `http://localhost:3000` or it will not work.

3. Create an **.env** file at the top level of the project with the following values (substituting your own id and PostgreSQL username and password):
```bash
DATABASE_URL=postgres://user:password@localhost:5432/auth
DOMAIN=http://localhost:3000
JWT_SECRET=replace_with_your_own
SEND_IN_BLUE_URL=https://api.sendinblue.com
SEND_IN_BLUE_KEY=replace_with_your_own
SEND_IN_BLUE_FROM='{ "email":"jdoe@example.com", "name":"John Doe" }'
SEND_IN_BLUE_ADMINS='{ "email":"jdoe@example.com", "name":"John Doe" }'
PUBLIC_GOOGLE_CLIENT_ID=replace_with_your_own
```

## Run locally

```bash
# Start the server and open the app in a new browser tab
npm run dev -- --open
```

## Valid logins

The db_create.sql script adds three users to the database with obvious roles:
- admin@example.com password admin123
- teacher@example.com password teacher123
- student@example.com password student123

## My ask of you

Please report any issues [here](https://github.com/nstuyvesant/sveltekit-auth-example/issues). [Pull requests](https://github.com/nstuyvesant/sveltekit-auth-example/pulls) are encouraged especially as SvelteKit is evolving rapidly.