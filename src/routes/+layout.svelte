<script lang="ts">
  import { onMount } from 'svelte'
  import type { LayoutData } from './$types'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { loginSession, toast } from '../stores'
  import useAuth from '$lib/auth'
  import 'bootstrap/scss/bootstrap.scss' // preferred way to load Bootstrap SCSS for hot module reloading

	export let data: LayoutData

  // If returning from different website, runs once (as it's an SPA) to restore user session if session cookie is still valid
  const { user } = data
  $loginSession = user

  // Vue.js Composition API style
	const { initializeSignInWithGoogle, logout } = useAuth(page, loginSession, goto)

  let Toast: any

  onMount(async () => {
    await import('bootstrap/js/dist/collapse') // lots of ways to load Bootstrap but prefer this approach to avoid SSR issues
    Toast = (await import('bootstrap/js/dist/toast')).default
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
        <a class="nav-link" class:d-none={!$loginSession || $loginSession.id === 0} href="/profile">Profile</a>
        <a class="nav-link" class:d-none={!$loginSession || $loginSession?.role !== 'admin'} href="/admin">Admin</a>
        <a class="nav-link" class:d-none={!$loginSession || $loginSession?.role === 'student'} href="/teachers">Teachers</a>
        <a class="nav-link" class:d-none={!!$loginSession} href="/login">Login</a>
        <a on:click|preventDefault={logout} class="nav-link" class:d-none={!$loginSession || $loginSession.id === 0} href={'#'}>Logout</a>
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
  // Make Retina displays crisper
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .toast {
    z-index: 9999;
  }
</style>