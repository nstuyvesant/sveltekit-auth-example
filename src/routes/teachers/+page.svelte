<script lang="ts">
	import type { PageData } from './$types'
	interface Props {
		data: PageData
	}

	let { data }: Props = $props()
</script>

<svelte:head>
	<title>Teachers</title>
</svelte:head>

<h1>Teachers</h1>
<h4>Teacher Or Admin Role</h4>
<p>{data.message}</p>
