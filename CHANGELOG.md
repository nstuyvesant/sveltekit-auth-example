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