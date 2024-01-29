import { writable, type Writable } from 'svelte/store'

export const toast = writable({
	title: '',
	body: '',
	isOpen: false
})

// While server determines whether the user is logged in by examining RequestEvent.locals.user, the
// loginSession is updated so all parts of the SPA client-side see the user and role.
export const loginSession = <Writable<User>>writable(undefined)

export const googleInitialized = writable(false)
