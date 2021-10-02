type FocusResult = (formName: HTMLFormElement) => void

export const focusOnFirstError: FocusResult = (form: HTMLFormElement) => {
  for(const field of form.elements) {
    if (!field.checkValidity()) {
      field.focus()
      break
    }
  }
}
