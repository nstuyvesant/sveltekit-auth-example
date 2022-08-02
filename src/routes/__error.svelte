<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ error, status }) => {
    const { message } = <Error> error
    return {
      props: {
        errorMessage: `${status}: ${message}`
      }
    }
  }
</script>

<script lang="ts">
  export let errorMessage = ''
</script>

<h1>Error</h1>
<h4>{errorMessage}</h4>
