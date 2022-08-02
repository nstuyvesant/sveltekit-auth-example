/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Readable, Writable } from 'svelte/store'
import { config } from '$lib/config'

type Page = Readable<{
  url: URL;
  params: Record<string, string>;
  stuff: App.Stuff;
  status: number;
  error: Error | null;
}>

export default function useAuth(page: Page, session: Writable<any>, goto: (url: string | URL, opts?: { replaceState?: boolean; noscroll?: boolean; keepfocus?: boolean; state?: any; }) => Promise<any>) {

  // Required to use session.set()
  let sessionValue: App.Session
  session.subscribe(value => {
    sessionValue = value
  })

  let referrer: string | null
  page.subscribe(value => {
		referrer = value.url.searchParams.get('referrer')
	})

  const loadScript = () => new Promise( (resolve, reject) => {
    const script = document.createElement('script')
    script.id = 'gsiScript'
    script.async = true
    script.src = 'https://accounts.google.com/gsi/client'
    script.onerror = (error) => reject(error)
    script.onload = () => resolve(script)
    document.body.appendChild(script)
  })

  function googleAccountsIdInitialize() {
    return window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: googleCallback
    })
  }

  function googleAccountsIdRenderButton(htmlId: string) {
    return window.google.accounts.id.renderButton(
      document.getElementById(htmlId), {
        theme: 'filled_blue',
        size: 'large',
        width: '367'
      }
    )
  }

  function initializeSignInWithGoogle(htmlId?: string) {
    googleAccountsIdInitialize()

    if (htmlId) {
      return googleAccountsIdRenderButton(htmlId)
    }

    if (!sessionValue.user) window.google.accounts.id.prompt()
  }

  function setSessionUser(user: User | null) {
    session.update(s => ({
      ...s,
      user
    }))
  }

  async function googleCallback(response: GoogleCredentialResponse) {
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
      if (err instanceof Error) {
        console.error('Login error', err)
        throw new Error(err.message)
      }
    }
  }

  async function loginLocal(credentials: Credentials) {
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
        setSessionUser(fromEndpoint.user)
        const { role } = fromEndpoint.user
        if (referrer) return goto(referrer)
        if (role === 'teacher') return goto('/teachers')
        if (role === 'admin') return goto('/admin')
        return goto('/')
      } else {
        throw new Error(fromEndpoint.message)
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error('Login error', err)
        throw new Error(err.message)
      }
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

  return { loadScript, initializeSignInWithGoogle, registerLocal, loginLocal, logout }
}