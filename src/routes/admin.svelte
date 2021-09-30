<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'

	// export const ssr = false
	export const prerender = false

	export const load: Load = ({ session }) => {
		const authorized = ['admin']
		if (!authorized.includes(session.user?.role)) { // also checked !session.authenticated but !session.user is good enough
			return {
				status: 302,
				redirect: '/login?referrer=/admin'
			}
		}
		return {}
	}
</script>

<h1>Admin</h1>
<h4>Admin Role</h4>
