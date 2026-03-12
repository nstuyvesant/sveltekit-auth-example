/**
 * Focuses the first invalid input element within a form.
 *
 * Iterates through the form's elements in DOM order and calls `focus()` on the
 * first `HTMLInputElement` that fails constraint validation, then stops.
 *
 * @param form - The form element to search for invalid inputs.
 */
export const focusOnFirstError = (form: HTMLFormElement) => {
	for (const field of Array.from(form.elements)) {
		if (field instanceof HTMLInputElement && !field.checkValidity()) {
			field.focus()
			break
		}
	}
}
