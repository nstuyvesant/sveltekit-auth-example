<script lang="ts" context="module">
  import { page } from '$app/stores'
</script>

<h1>{$page.status}</h1>
<h4>{$page.error?.message}</h4>
