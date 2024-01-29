export const focusOnFirstError = (form: HTMLFormElement) => {
	for (const field of form.elements) {
		if (field instanceof HTMLInputElement && !field.checkValidity()) {
			field.focus()
			break
		}
	}
}
