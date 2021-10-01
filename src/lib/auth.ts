import type { Readable, Writable } from 'svelte/store'
import type { Page } from '@sveltejs/kit'
import { config } from '$lib/config'

type UseAuth = {
  initializeSignInWithGoogle: () => void
  registerLocal: (user: User) => Promise<void>
  loginLocal: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
}
export default function useAuth(page: Readable<Page<Record<string, string>>>, session: Writable<any>, goto): UseAuth {

  // Required to use session.set()
  let sessionValue
  session.subscribe(value => {
    sessionValue = value
  })

  let referrer
  page.subscribe(value => {
		referrer = value.query.get('referrer')
	})

  function initializeSignInWithGoogle() {
    if (!window.google.initialized) {
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: googleCallback
      })
      window.google.initialized = true
    } else 
      console.log('Sign in with Google already initialized.')
  }

  async function googleCallback(response) {
    const res = await fetch('/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: response.credential })
    })
    const fromEndpoint = await res.json()

    if (res.ok) {
      session.set({ user: fromEndpoint.user })
      const { role } = fromEndpoint.user
      if (referrer) return goto(referrer)
      if (role === 'teacher') return goto('/teachers')
      if (role === 'admin') return goto('/admin')
      // Don't stay on login if successfully authenticated
      if (window.location.pathname === '/login') goto('/')
    }
  }

  async function registerLocal(user: User) {
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(user),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const fromEndpoint = await res.json()
      if (res.ok) {
        session.set({ user: fromEndpoint.user })
        goto('/')
      } else {
        throw new Error(fromEndpoint.message)
      }
    } catch (err) {
      console.error('Login error', err)
      throw new Error(err.message)
    }
  }

  async function loginLocal(credentials) {
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const fromEndpoint = await res.json()
      if (res.ok) {
        session.set({ user: fromEndpoint.user })
        const { role } = fromEndpoint.user
        if (referrer) return goto(referrer)
        if (role === 'teacher') return goto('/teachers')
        if (role === 'admin') return goto('/admin')
        return goto('/')
      } else {
        throw new Error(fromEndpoint.message)
      }
    } catch (err) {
      console.error('Login error', err)
      throw new Error(err.message)
    }
  }

  async function logout() {
    // Request server delete httpOnly cookie called session
    const url = '/auth/logout'
    const res = await fetch(url, {
      method: 'POST'
    })
    if (res.ok) {
      session.set({}) // delete session.user from 
      goto('/login')
    } else console.error(`Logout not successful: ${res.statusText} (${res.status})`)
  }

  return { initializeSignInWithGoogle, registerLocal, loginLocal, logout }
}