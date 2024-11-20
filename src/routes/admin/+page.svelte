<script lang="ts">
	import type { PageData } from './$types'
	interface Props {
		data: PageData
	}

	let { data }: Props = $props()
</script>

<svelte:head>
	<title>Administration</title>
</svelte:head>

<h1>Admin</h1>
<h4>Admin Role</h4>
<p>{data.message}</p>
