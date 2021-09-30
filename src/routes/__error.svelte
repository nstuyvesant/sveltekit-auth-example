<script lang="ts" context="module">
  export const load = ({ error, status }) => {
    return {
      props: {
        errorMessage: `${status}: ${error.message}`
      }
    }
  }
</script>

<script lang="ts">
  export let errorMessage
</script>

<h1>Error</h1>
<h4>{errorMessage}</h4>
