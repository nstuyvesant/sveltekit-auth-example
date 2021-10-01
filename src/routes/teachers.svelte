<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'

	// export const ssr = false
	export const prerender = false

	export const load: Load = async ({ session }) => {
    const authorized = ['admin', 'teacher']
		if (!authorized.includes(session.user?.role)) {
			return {
				status: 302,
				redirect: '/login?referrer=/teachers'
			}
		}

		const url = '/api/v1/teacher'
		const res = await fetch(url, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		})

		// if !res.ok, error is returned as message
		const { message } = await res.json()
		return {
			props: {
				message
			}
		}
	}
</script>

<script lang="ts">
	export let message
</script>

<svelte:head>
  <title>Teachers</title>
</svelte:head>

<h1>Teachers</h1>
<h4>Teacher Or Admin Role</h4>
<p>{message}</p>