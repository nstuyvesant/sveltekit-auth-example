# SvelteKit Authentication and Authorization Example

This is an example of how to register, authenticate, and update users and limit their access to
areas of the website by role (admin, teacher, student).

It's an SPA built with SvelteKit and a PostgreSQL database back-end. Code is TypeScript and the website is styled using Bootstrap. PostgreSQL functions handle password hashing and UUID generation for the session ID. 

Unlike most authentication examples, this SPA does not use callbacks that redirect back to the site (causing the website to be reloaded with a visual flash). Because of that, **getSession()** in hooks.ts is not useful. Instead, the client makes REST calls, gets the user in the body of the response (if successful) and adds the user to the client-side session store.

The website supports two types of authentication:
1. **Local accounts** via username (email) and password
   - The login form (/src/routes/login.svelte) sends the login info as JSON to endpoint /auth/login
   - The endpoint passes the JSON to PostgreSQL function authenticate(json) which hashes the password and compares it to the stored hashed password in the users table. The function returns JSON containing a session ID (v4 UUID) and user object (sans password).
   - The endpoint sends session ID as an httpOnly SameSite cookie and the user object in the body of the response.
   - The client stores the user object in SvelteKit's session store.
2. **Sign in with Google**
   - **Sign in with Google** is initialized in /src/routes/__layout.svelte.
   - **One Tap** "dialog" is displayed on the Home page (/src/routes/index.svelte) while the **Sign in with Google** button is on the login page (/src/routes/login.svelte).
   - Clicking either button opens a new window asking the user to authorize this website. If they OK it, a JWT is sent to a callback function.
   - The callback function (in /src/lib/auth.ts) sends the JWT to an endpoint on this server /auth/google.
   - The endpoint decodes and validates the user information then calls the PostgreSQL function start_gmail_user_session to upsert the user to the database returing a session id in an httpOnly SameSite cookie and user in the body of the response.
   - The client stores the user object in SvelteKit's session store.

As the client calls endpoints, each request to the server includes the session ID in the httpOnly cookie. The handle() function in hooks.ts checks the database for this session ID. If it exists and is not expired, it attaches the user (including role) to request.locals. Each endpoint can then examine request.locals.user.role to determine whether to respond or return a 401.

> There is some overhead to checking the user session in a database each time versus using a JSON web token; however, validating each request avoids problems discussed in [this article](https://redis.com/blog/json-web-tokens-jwt-are-dangerous-for-user-sessions/) and [this one](https://scotch.io/bar-talk/why-jwts-suck-as-session-tokens). For a high-volume website, I would use Redis or the equivalent.

Pages use the session.user.role to determine whether they are authorized. While a malicious user could alter the client-side session store to see pages they should not, the dynamic data in those restricted pages is served via endpoints which check request.locals.user to determine whether to grant access.

The forgot password functionality uses SendInBlue to send the email. You would need to have a SendInBlue account and set three environmental variables. Email sending is in /src/routes/auth/forgot.ts. This code could easily be replaced by nodemailer or something similar.

## Prerequisites
- PostgreSQL 13 or higher
- Node.js 16.13.0 or higher
- npm 8.1.0 or higher
- Google API client
- SendInBlue account (only used for emailing password reset link - the sample can run without it but forgot password will not work)

## Setting up the project

Here are the steps using a macOS, Linux or UNIX command-line:

1. Get the project and setup the database
```bash
# Clone the repo to your current directory
git clone https://github.com/nstuyvesant/sveltekit-auth-example.git

# Install the dependencies
cd /sveltekit-auth-example
npm install

# Create PostgreSQL database
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
VITE_GOOGLE_CLIENT_ID=replace_with_your_own
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

Please report any issues or areas where the code can be optimized.