# Backlog
* Add password complexity checking on /register and /profile pages (only checks for length currently despite what the pages say)

# 1.0.58
* Bump pg, sveltekit, adapter-node, bootstrap, svelte, sass, jsonwebtoken, google-auth-library, vite, vitest

# 1.0.57
* Minor bumps for pg, tslib, typescript

# 1.0.56
* Svelte 4, minor updates for other dependencies

# 1.0.55
* Add comment to indicate property that should be removed if ssl is turned off on the PostgreSQL server (thanks Brazos)
* Update public.reset_password stored procedure to plpgsql (thanks Brazos)

# 1.0.54
* Bump sveltekit, @types/pg, @typescript*, boostrap, eslint, prettier-plugin-svelte, sass, tslib, typescript, vitest

# 1.0.53
* Fix service-worker.ts typing
* Bump pg, sveltekit, svelte, vite, tslib and other devDependencies

# 1.0.52
* Bump @sveltejs/kit, svelte, vite, vitest, pg, adapter-node, google-auth-library, eslint, sass, @typescript*, typescript, prettier, eslint-config-prettier, prettier-plugin-svelte, svelte-check

# 1.0.50
* Bump @sveltejs/kit, vite, @typescript*

# 1.0.50
* Bump @sveltejs/kit, sass, vite

# 1.0.49
* Bump @sveltejs/kit, adapter-node, @typescript*, sass, vitest

# 1.0.48
* Bump node, npm, @sveltejs/kit, adapter-node, eslint, prettier

# 1.0.47
* Bump @sveltejs/kit, adapter-node, @types/google.accounts, @typescript*, eslint, sass, typescript, vite, vitest

# 1.0.46
* Bump @sveltejs/kit, pg, tslib, vitest

# 1.0.45
* Bump @sveltejs/kit, adapter-node, svelte-check, @typescript*, eslint, prettier, vitest, @types/jsonwebtoken

# 1.0.44
* Bump @sveltejs/kit, svelte

# 1.0.43
* Bump @sveltejs/kit, svelte-check, vitest, @typescript*, prettier

# 1.0.42
* Bump @sveltejs/kit, vite, @typescript*, eslint-config-prettier, @types/google.accounts

# 1.0.41
* Bump @sveltejs/kit, vite, jsonwebtoken, svelte-check, sass

# 1.0.39
* Bump Svelte, SvelteKit, adapter-node, vite, svelte-preprocess,sass, svelte-check, typescript, prettier, prettier-plugin-svelte

# 1.0.38
* Switch from SendInBlue to Sendgrid for email
* Bump SvelteKit, adapter-node, and vite

# 1.0.37
* Bump SvelteKit, svelte-check, and a few dev dependencies

# 1.0.36
* Bump SvelteKit, adapter-node, Bootstrap, prettier

# 1.0.35
* Update SvelteKit, vite, Typescript

# 1.0.34
* Update SvelteKit

# 1.0.33
* Update dependencies

# 1.0.32
* Remove window from reference to google.accounts
* Add apple-touch-icon.png
* Update dependencies
* Remove dead code

# 1.0.31
* Cleanup
* Update SvelteKit

# 1.0.30
* Fixed bug where opening /login or /register would fail to render Sign in With Google button (onMount in +layout.svelte loads after children's onMount)
* Fix bad path for favicon
* Update dependencies

# 1.0.29
* Fixed bug in hooks.server.ts - new version of SvelteKit complains about modifying cookie after `const response = await resolve(event)` so moved it up two lines.
* Update dependencies

# 1.0.28
* Update dependencies

# 1.0.27
* Update dependencies

# 1.0.26
* On the client, track whether the login session has expired and if so, clear $loginSession
* Update dependencies

# 1.0.25
* Bump dependencies
* Simplify Sign In With Google

# 1.0.24
* Bump dependencies

# 1.0.23
* Restructured server-side libraries to $lib/server based on https://github.com/sveltejs/kit/pull/6623
* General cleanup

# 1.0.22
* Move google-auth-library and jsonwebtoken to devDependencies from dependencies and other cleanup to package.json

# 1.0.21
* Refactor to use $env/static/private and public, dropping dotenv dependency
* Remove @types/cookie and bootstrap-icons dependencies

# 1.0.20
* Bump dependencies
* Add service-worker
* Add dropdown, avatarm and user's first name to navbar once user is logged in
* Refactor user session and update typing

# 1.0.19
* Added SvelteKit's cookies implementation in RequestEvent
* [Bug] Logout then go to http://localhost/admin gives error on auth.ts:39

# 1.0.18
* Bump dependencies

# 1.0.17
* Bump dependencies

# 1.0.16
* [Bug] Fixed LayoutServerLoad typing

# 1.0.15
* [Bug] Replaced use of Action type in +server.ts files (only works for +page.server.ts)

# 1.0.14
* Refactor routing to be folder, not file-based - https://github.com/sveltejs/kit/discussions/5774 (file system router). More info: https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3294867
* Move bootstrap SCSS import to JavaScript in +layout.svelte
* Refactor as session was removed in https://github.com/sveltejs/kit/discussions/5883

# 1.0.13
* Bump dependencies

# 1.0.12
* Remove unnecessary reference from app.d.ts
* Remove commented lines in svelte.config.js

# 1.0.10
* Bump dependencies
* Adjust for changes to SvelteKit
* Improve typings

# 1.0.9
* Bump dependencies
* Adjust for changes to SvelteKit with respect to vite

# 1.0.7
* Bump dependencies and verify against latest SvelteKit
* Additional changes for register PostgreSQL function

# 1.0.5
* Bump dependencies
* [Fix] Flaw in register allowing user to register over top of an existing account
* Additional checks of submitted data

# 1.0.4
* Bump dependencies

# 1.0.4
* [Fix] If you login with a Google account, you cannot Update the Profile (UI is looking for password and confirm password which don't make sense in this context)
* Added Content Security Policy

# 1.0.3
* [Fix] user created or updated when password mismatches (@lxy-yz)
* Updated project dependencies
* Replaced Sveltestrap's Toast with native Bootstrap 5 JavaScript to avoid error with @popperjs import (lacks type=module)
* Added declarations for Session and Locals for type safety

# 1.0.2
* [Fix] Updated endpoints and hooks to conform to SvelteKit's API changes.
* Updated project dependencies

# 1.0.1
* Switched to dotenv vs. VITE_ env values for better security
* Load Sign in with Google via code instead of static template
* Fix logout (didn't work if session expired)
* Fix login button rendering if that's the starting page

# Backlog
* [Low] Add password complexity check
* [Low] Add Google reCaptcha 3