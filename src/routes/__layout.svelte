<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page, session } from '$app/stores'
  import { toast } from '../stores'
  import useAuth from '$lib/auth'

  // Vue.js Composition API style
	const { loadScript, initializeSignInWithGoogle, logout } = useAuth(page, session, goto)

  let sessionValue
  session.subscribe(value => {
		sessionValue = value
	})

  let Toast

  onMount(async() => {
    await import('bootstrap/js/dist/collapse')
    Toast = (await import('bootstrap/js/dist/toast')).default
		await loadScript()
		initializeSignInWithGoogle()
	})

  const openToast = (open: boolean) => {
    if (open) {
      const toastDiv = <HTMLDivElement> document.getElementById('authToast')
      const t = new Toast(toastDiv)
      t.show()
    }
  }

  $: openToast($toast.isOpen)
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
  <div class="container">
    <a class="navbar-brand" href="/">Auth</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain" aria-controls="navbarMain" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarMain">
      <div class="navbar-nav">
        <a class="nav-link active" aria-current="page" href="/">Home</a>
        <a class="nav-link" href="/info">Info</a>
        <a class="nav-link" class:d-none={!$session.user} href="/profile">Profile</a>
        <a class="nav-link" class:d-none={!$session.user || $session.user?.role !== 'admin'} href="/admin">Admin</a>
        <a class="nav-link" class:d-none={!$session.user || $session.user?.role === 'student'} href="/teachers">Teachers</a>
        <a class="nav-link" class:d-none={!!$session.user} href="/login">Login</a>
        <a on:click|preventDefault={logout} class="nav-link" class:d-none={!$session.user} href={'#'}>Logout</a>
      </div>
    </div>
  </div>
</nav>

<main class="container">
  <slot/>

  <div id="authToast" class="toast position-fixed top-0 end-0 m-3" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header bg-primary text-white">
      <strong class="me-auto">{$toast.title}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      {$toast.body}
    </div>
  </div>

</main>

<style lang="scss" global>
  // Load Bootstrap's SCSS
  @import 'bootstrap/scss/bootstrap';

  // Make Retina displays crisper
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .toast {
    z-index: 9999;
  }
</style>