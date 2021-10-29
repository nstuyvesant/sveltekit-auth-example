<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page, session } from '$app/stores'
  import { Toast, ToastBody, ToastHeader } from 'sveltestrap'
  import { toast } from '../stores'
  import useAuth from '$lib/auth'

  // Vue.js Composition API style
	const { loadScript, initializeSignInWithGoogle, logout } = useAuth(page, session, goto)

  let sessionValue
  session.subscribe(value => {
		sessionValue = value
	})

  onMount(async() => {
    // Instead of loading the entire Bootstrap bundle when we only need collapse for the Navbar,
    // we can load it here since this is guaranteed to only execute on the browser
    await import('bootstrap/js/dist/collapse')

		await loadScript()
		initializeSignInWithGoogle()
	})

  const toggle = () => {
    $toast.isOpen = !$toast.isOpen
  }
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
  <Toast class="position-fixed top-0 end-0 m-3" autohide={true} delay={4000} duration={800} isOpen={$toast.isOpen} on:close={() => ($toast.isOpen = false)}>
    <ToastHeader class="bg-primary text-white" {toggle}>{$toast.title}</ToastHeader>
    <ToastBody>{$toast.body}</ToastBody>
  </Toast>
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