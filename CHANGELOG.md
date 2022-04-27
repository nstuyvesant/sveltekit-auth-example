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