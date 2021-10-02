import { writable } from 'svelte/store'

export const toast = writable({
  title: '',
  body: '',
  isOpen: false
})