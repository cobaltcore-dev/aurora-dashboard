import { useStore } from "@tanstack/react-form"
import { createRuleFormSchema, type AddRuleFormValues } from "./formSchema"
import type { AddRuleFormApi } from "../AddRuleModal"

export type AddRuleFormField = keyof AddRuleFormValues
export type AddRuleFieldErrors = Partial<Record<AddRuleFormField, string>>

/** First schema error per field for the given form values */
export const getRuleFormErrors = (values: AddRuleFormValues): AddRuleFieldErrors => {
  const result = createRuleFormSchema.safeParse(values)
  if (result.success) return {}

  const errors: AddRuleFieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as AddRuleFormField
    if (!errors[field]) errors[field] = issue.message
  }
  return errors
}

/**
 * Error to show under a field. Like the other network forms, a field's error appears once the user leaves it
 * (or submits) and is hidden again while they edit it. Visibility is tracked with the field's `isBlurred` meta.
 */
export const useRuleFieldError = (form: AddRuleFormApi, field: AddRuleFormField): string | undefined =>
  useStore(form.store, (state) =>
    state.fieldMeta[field]?.isBlurred ? getRuleFormErrors(state.values)[field] : undefined
  )

/** Hides the field's error until it is blurred again; call it from the field's onChange */
export const hideRuleFieldError = (form: AddRuleFormApi, field: AddRuleFormField) =>
  form.setFieldMeta(field, (prev) => ({ ...prev, isBlurred: false }))

/** Shows the field's error as if it had been blurred */
export const showRuleFieldError = (form: AddRuleFormApi, field: AddRuleFormField) =>
  form.setFieldMeta(field, (prev) => ({ ...prev, isBlurred: true }))

/** Shows the errors of every rendered field, e.g. when the form is submitted */
export const showAllRuleFieldErrors = (form: AddRuleFormApi) =>
  (Object.keys(form.state.fieldMeta) as AddRuleFormField[]).forEach((field) => showRuleFieldError(form, field))
