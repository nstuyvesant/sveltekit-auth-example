// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('$env/static/public', () => ({ PUBLIC_GOOGLE_CLIENT_ID: 'test-client-id' }))
vi.mock('$lib/app-state.svelte', () => ({ appState: { googleInitialized: false, user: undefined } }))
vi.mock('$lib/auth-redirect', () => ({ redirectAfterLogin: vi.fn() }))

import { renderGoogleButton, initializeGoogleAccounts } from './google'
import { appState } from '$lib/app-state.svelte'
import { redirectAfterLogin } from '$lib/auth-redirect'

const mockRedirectAfterLogin = vi.mocked(redirectAfterLogin)

/** Build a minimal google.accounts.id mock and attach it to globalThis. */
function installGoogleMock() {
	const mock = {
		initialize: vi.fn(),
		renderButton: vi.fn()
	}
	;(globalThis as unknown as Record<string, unknown>).google = {
		accounts: { id: mock }
	}
	return mock
}

function removeGoogleMock() {
	delete (globalThis as unknown as Record<string, unknown>).google
}

describe('renderGoogleButton', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
		appState.googleInitialized = false
	})

	afterEach(() => {
		removeGoogleMock()
		vi.useRealTimers()
	})

	it('calls google.accounts.id.renderButton with the button element', () => {
		const mock = installGoogleMock()
		const btn = document.createElement('div')
		btn.id = 'googleButton'
		document.body.appendChild(btn)

		renderGoogleButton()

		expect(mock.renderButton).toHaveBeenCalledOnce()
		expect(mock.renderButton).toHaveBeenCalledWith(btn, expect.objectContaining({
			type: 'standard',
			theme: 'outline',
			size: 'large'
		}))
	})

	it('falls back to 400 when the button has no width', () => {
		const mock = installGoogleMock()
		const btn = document.createElement('div')
		btn.id = 'googleButton'
		document.body.appendChild(btn)

		renderGoogleButton()

		const [, opts] = mock.renderButton.mock.calls[0]
		expect(opts.width).toBe(400)
	})

	it('does nothing when the googleButton element is absent', () => {
		const mock = installGoogleMock()

		renderGoogleButton()

		expect(mock.renderButton).not.toHaveBeenCalled()
	})

	it('polls until google is available, then renders', () => {
		vi.useFakeTimers()
		const btn = document.createElement('div')
		btn.id = 'googleButton'
		document.body.appendChild(btn)

		renderGoogleButton() // google not yet defined

		const mock = installGoogleMock()
		vi.advanceTimersByTime(100) // advance past one poll interval

		expect(mock.renderButton).toHaveBeenCalledOnce()
	})

	it('gives up polling after 10 seconds without throwing', () => {
		vi.useFakeTimers()
		// google is never installed

		expect(() => {
			renderGoogleButton()
			vi.advanceTimersByTime(11_000)
		}).not.toThrow()
	})
})

describe('initializeGoogleAccounts', () => {
	beforeEach(() => {
		appState.googleInitialized = false
		appState.user = undefined
		mockRedirectAfterLogin.mockReset()
		document.body.innerHTML = ''
	})

	afterEach(() => {
		removeGoogleMock()
		vi.useRealTimers()
	})

	it('calls google.accounts.id.initialize with the client id', () => {
		const mock = installGoogleMock()

		initializeGoogleAccounts()

		expect(mock.initialize).toHaveBeenCalledOnce()
		expect(mock.initialize).toHaveBeenCalledWith(expect.objectContaining({
			client_id: 'test-client-id'
		}))
	})

	it('sets appState.googleInitialized to true', () => {
		installGoogleMock()

		initializeGoogleAccounts()

		expect(appState.googleInitialized).toBe(true)
	})

	it('does not call initialize a second time if already initialized', () => {
		const mock = installGoogleMock()
		appState.googleInitialized = true

		initializeGoogleAccounts()

		expect(mock.initialize).not.toHaveBeenCalled()
	})

	it('callback POSTs the credential token to /auth/google and updates appState', async () => {
		const mock = installGoogleMock()
		const user = { id: 1, role: 'admin' }
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ user }), { status: 200 })
		)

		initializeGoogleAccounts()

		// Extract and invoke the registered callback
		const { callback } = mock.initialize.mock.calls[0][0]
		await callback({ credential: 'test-credential' })

		expect(fetch).toHaveBeenCalledWith('/auth/google', expect.objectContaining({
			method: 'POST',
			body: JSON.stringify({ token: 'test-credential' })
		}))
		expect(appState.user).toEqual(user)
		expect(mockRedirectAfterLogin).toHaveBeenCalledWith(user)
	})

	it('callback does not update state when the response is not ok', async () => {
		const mock = installGoogleMock()
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(null, { status: 401 })
		)

		initializeGoogleAccounts()

		const { callback } = mock.initialize.mock.calls[0][0]
		await callback({ credential: 'bad-credential' })

		expect(appState.user).toBeUndefined()
		expect(mockRedirectAfterLogin).not.toHaveBeenCalled()
	})

	it('polls until google is available, then initializes', () => {
		vi.useFakeTimers()

		initializeGoogleAccounts() // google not yet defined

		const mock = installGoogleMock()
		vi.advanceTimersByTime(100)

		expect(mock.initialize).toHaveBeenCalledOnce()
	})
})
