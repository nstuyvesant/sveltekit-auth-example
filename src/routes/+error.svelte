<script lang="ts" module>
	import { page } from '$app/state'
</script>

<h1>{page.status}</h1>
<h4>{page.error?.message}</h4>
