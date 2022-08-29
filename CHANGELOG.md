# Backlog
* Consider not setting defaultUser in loginSession as it would simplify +layout.svelte.
* Refactor $env/dynamic/private and public
* Add password complexity checking on /register and /profile pages (only checks for length currently despite what the pages say)

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