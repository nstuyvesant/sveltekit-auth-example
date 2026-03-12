// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { focusOnFirstError } from './focus'

function makeInput(valid: boolean): HTMLInputElement {
	const input = document.createElement('input')
	input.type = 'text'
	if (!valid) {
		input.required = true
		// leave value empty so checkValidity() returns false
	}
	input.focus = vi.fn()
	return input
}

function makeForm(...inputs: HTMLInputElement[]): HTMLFormElement {
	const form = document.createElement('form')
	for (const input of inputs) form.appendChild(input)
	return form
}

describe('focusOnFirstError', () => {
	it('focuses the first invalid input', () => {
		const invalid = makeInput(false)
		const form = makeForm(invalid)

		focusOnFirstError(form)

		expect(invalid.focus).toHaveBeenCalledOnce()
	})

	it('does not focus a valid input', () => {
		const valid = makeInput(true)
		const form = makeForm(valid)

		focusOnFirstError(form)

		expect(valid.focus).not.toHaveBeenCalled()
	})

	it('focuses only the first invalid input when multiple are invalid', () => {
		const first = makeInput(false)
		const second = makeInput(false)
		const form = makeForm(first, second)

		focusOnFirstError(form)

		expect(first.focus).toHaveBeenCalledOnce()
		expect(second.focus).not.toHaveBeenCalled()
	})

	it('skips valid inputs before the first invalid one', () => {
		const valid = makeInput(true)
		const invalid = makeInput(false)
		const form = makeForm(valid, invalid)

		focusOnFirstError(form)

		expect(valid.focus).not.toHaveBeenCalled()
		expect(invalid.focus).toHaveBeenCalledOnce()
	})

	it('does nothing when the form has no inputs', () => {
		const form = document.createElement('form')
		// Should not throw
		expect(() => focusOnFirstError(form)).not.toThrow()
	})

	it('does nothing when all inputs are valid', () => {
		const a = makeInput(true)
		const b = makeInput(true)
		const form = makeForm(a, b)

		focusOnFirstError(form)

		expect(a.focus).not.toHaveBeenCalled()
		expect(b.focus).not.toHaveBeenCalled()
	})

	it('ignores non-input elements (e.g. select, button)', () => {
		const select = document.createElement('select')
		select.required = true
		const focusSpy = vi.spyOn(select, 'focus')
		const form = document.createElement('form')
		form.appendChild(select)

		focusOnFirstError(form)

		expect(focusSpy).not.toHaveBeenCalled()
	})
})
