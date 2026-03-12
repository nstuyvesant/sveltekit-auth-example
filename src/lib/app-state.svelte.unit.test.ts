import { describe, it, expect, beforeEach } from 'vitest'
import { appState } from './app-state.svelte'

describe('appState', () => {
	beforeEach(() => {
		// Reset to initial state before each test
		appState.user = undefined
		appState.toast = { title: '', body: '', isOpen: false }
		appState.googleInitialized = false
	})

	describe('initial state', () => {
		it('user is undefined', () => {
			expect(appState.user).toBeUndefined()
		})

		it('toast starts closed with empty strings', () => {
			expect(appState.toast).toEqual({ title: '', body: '', isOpen: false })
		})

		it('googleInitialized is false', () => {
			expect(appState.googleInitialized).toBe(false)
		})
	})

	describe('user', () => {
		it('can be set to a user object', () => {
			const user: User = {
				id: 1,
				role: 'admin',
				email: 'admin@example.com',
				firstName: 'Jane',
				lastName: 'Doe',
				phone: '412-555-1212',
				optOut: false
			}

			appState.user = user

			expect(appState.user).toEqual(user)
		})

		it('can be cleared back to undefined', () => {
			appState.user = {
				id: 1,
				role: 'student',
				email: 'a@b.com',
				firstName: 'A',
				lastName: 'B',
				phone: '',
				optOut: false
			}
			appState.user = undefined
			expect(appState.user).toBeUndefined()
		})
	})

	describe('toast', () => {
		it('can be updated to show a notification', () => {
			appState.toast = { title: 'Success', body: 'Your changes were saved.', isOpen: true }

			expect(appState.toast).toEqual({
				title: 'Success',
				body: 'Your changes were saved.',
				isOpen: true
			})
		})

		it('isOpen can be toggled independently', () => {
			appState.toast = { title: 'Hey', body: 'Hello', isOpen: true }
			appState.toast.isOpen = false

			expect(appState.toast.isOpen).toBe(false)
			expect(appState.toast.title).toBe('Hey')
		})
	})

	describe('googleInitialized', () => {
		it('can be set to true', () => {
			appState.googleInitialized = true

			expect(appState.googleInitialized).toBe(true)
		})
	})
})
