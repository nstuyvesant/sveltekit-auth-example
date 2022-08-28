import { writable } from 'svelte/store'

export const toast = writable({
  title: '',
  body: '',
  isOpen: false
})

// While server determines whether the user is logged in by examining RequestEvent.locals.user, the
// loginSession is updated so all parts of the SPA client-side see the user and role.

export const defaultUser: User = {
  id: 0, // the not-logged-in user id
  role: 'student' // default role for users who are not logged in
}

export const loginSession = writable(defaultUser)
