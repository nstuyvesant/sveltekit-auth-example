<script lang="ts">
	import type { PageData } from './$types'
	export let data: PageData
</script>

<svelte:head>
  <title>Teachers</title>
</svelte:head>

<h1>Teachers</h1>
<h4>Teacher Or Admin Role</h4>
<p>{data.message}</p>