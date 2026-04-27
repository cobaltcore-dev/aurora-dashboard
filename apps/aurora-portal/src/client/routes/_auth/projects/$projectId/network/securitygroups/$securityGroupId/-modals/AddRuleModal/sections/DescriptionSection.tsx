import { FormRow, Textarea } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"

interface DescriptionSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function DescriptionSection({ form, disabled = false }: DescriptionSectionProps) {
  const { t } = useLingui()

  return (
    <form.Field name="description">
      {(field) => (
        <FormRow className="mb-0">
          <Textarea
            id="description"
            name="description"
            label={t`Description`}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder={t`Optional description`}
            disabled={disabled}
            rows={2}
          />
        </FormRow>
      )}
    </form.Field>
  )
}
