<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'

	export const load: Load = async ({ fetch, session }) => {
		const authorized = ['admin']
		if (session.user && !authorized.includes(session.user.role)) {
			return {
				status: 302,
				redirect: '/login?referrer=/admin'
			}
		}

		const url = '/api/v1/admin'
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
	export let message = ''
</script>

<svelte:head>
  <title>Administration</title>
</svelte:head>

<h1>Admin</h1>
<h4>Admin Role</h4>
<p>{message}</p>