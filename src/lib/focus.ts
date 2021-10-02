type FocusResult = (formName: string) => void

export const focusOnFirstError: FocusResult = (formName: string) => {
  const form = document.forms[formName]
  for(const field of form.elements) {
    if (!field.checkValidity()) {
      field.focus()
      break
    }
  }
}
