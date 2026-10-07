import { FormRow, Textarea } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"
import { useRuleFieldError, hideRuleFieldError } from "../validation/fieldErrors"

interface DescriptionSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function DescriptionSection({ form, disabled = false }: DescriptionSectionProps) {
  const { t } = useLingui()
  const descriptionError = useRuleFieldError(form, "description")

  return (
    <form.Field name="description">
      {(field) => (
        <FormRow>
          <Textarea
            id="description"
            name="description"
            label={t`Description`}
            value={field.state.value}
            onChange={(e) => {
              field.handleChange(e.target.value)
              hideRuleFieldError(form, "description")
            }}
            onBlur={field.handleBlur}
            errortext={descriptionError}
            helptext={t`Optional. Up to 255 characters.`}
            disabled={disabled}
            rows={3}
          />
        </FormRow>
      )}
    </form.Field>
  )
}
