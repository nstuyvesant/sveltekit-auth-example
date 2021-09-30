<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'

	// export const ssr = false
	export const prerender = false

	export const load: Load = ({ session }) => {
    const authorized = ['admin', 'teacher']
		if (!authorized.includes(session.user?.role)) {
			return {
				status: 302,
				redirect: '/login?referrer=/teachers'
			}
		}
		return {}
	}
</script>

<h1>Teachers</h1>
<h4>Teacher Or Admin Role</h4>
