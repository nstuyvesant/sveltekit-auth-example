import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$app/navigation', () => ({ goto: vi.fn() }))
vi.mock('$app/state', () => ({ page: { url: { searchParams: new URLSearchParams() } } }))

import { redirectAfterLogin } from './auth-redirect'
import { goto } from '$app/navigation'
import { page } from '$app/state'

const mockGoto = vi.mocked(goto)
const mockPage = page as { url: { searchParams: URLSearchParams } }

const student: UserProperties = { id: 1, role: 'student' }
const teacher: UserProperties = { id: 2, role: 'teacher' }
const admin: UserProperties = { id: 3, role: 'admin' }

describe('redirectAfterLogin', () => {
	beforeEach(() => {
		mockGoto.mockReset()
		mockPage.url.searchParams = new URLSearchParams()
	})

	// ── No-op cases ────────────────────────────────────────────────────────────

	it('does nothing when user is undefined', () => {
		redirectAfterLogin(undefined)
		expect(mockGoto).not.toHaveBeenCalled()
	})

	it('does nothing when user is null', () => {
		redirectAfterLogin(null)
		expect(mockGoto).not.toHaveBeenCalled()
	})

	// ── Role-based defaults ────────────────────────────────────────────────────

	it('redirects a student to /', () => {
		redirectAfterLogin(student)
		expect(mockGoto).toHaveBeenCalledWith('/')
	})

	it('redirects a teacher to /teachers', () => {
		redirectAfterLogin(teacher)
		expect(mockGoto).toHaveBeenCalledWith('/teachers')
	})

	it('redirects an admin to /admin', () => {
		redirectAfterLogin(admin)
		expect(mockGoto).toHaveBeenCalledWith('/admin')
	})

	// ── Valid referrer ─────────────────────────────────────────────────────────

	it('redirects to the referrer path instead of the role default', () => {
		mockPage.url.searchParams = new URLSearchParams({ referrer: '/dashboard' })
		redirectAfterLogin(admin)
		expect(mockGoto).toHaveBeenCalledWith('/dashboard')
	})

	it('uses the referrer for any role', () => {
		mockPage.url.searchParams = new URLSearchParams({ referrer: '/some/path' })
		redirectAfterLogin(teacher)
		expect(mockGoto).toHaveBeenCalledWith('/some/path')
	})

	// ── Invalid referrer ────────────────────────────────────────────────────────

	it('ignores a referrer that does not start with /', () => {
		mockPage.url.searchParams = new URLSearchParams({ referrer: 'https://evil.com' })
		redirectAfterLogin(admin)
		expect(mockGoto).toHaveBeenCalledWith('/admin')
	})

	it('ignores a protocol-relative referrer starting with //', () => {
		mockPage.url.searchParams = new URLSearchParams({ referrer: '//evil.com' })
		redirectAfterLogin(admin)
		expect(mockGoto).toHaveBeenCalledWith('/admin')
	})

	it('ignores an empty referrer', () => {
		mockPage.url.searchParams = new URLSearchParams({ referrer: '' })
		redirectAfterLogin(student)
		expect(mockGoto).toHaveBeenCalledWith('/')
	})

	// ── Single goto call ────────────────────────────────────────────────────────

	it('calls goto exactly once', () => {
		redirectAfterLogin(student)
		expect(mockGoto).toHaveBeenCalledOnce()
	})
})
