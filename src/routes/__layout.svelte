<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page, session } from '$app/stores'
  import useAuth from '$lib/auth'

  const { initializeSignInWithGoogle, logout } = useAuth(page, session, goto)

  let sessionValue
  session.subscribe(value => {
		sessionValue = value
	})

  onMount(() => {
    initializeSignInWithGoogle()
    if (!sessionValue.user && window.location.pathname !== '/login')
      google.accounts.id.prompt() // open One Tap dialog
	})
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
  <div class="container">
    <a class="navbar-brand" href="/">Auth</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNavAltMarkup">
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
</main>

<style lang="scss" global>
  // Load Bootstrap's SCSS
  @import 'bootstrap/scss/bootstrap';

  // Make Retina displays crisper
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>