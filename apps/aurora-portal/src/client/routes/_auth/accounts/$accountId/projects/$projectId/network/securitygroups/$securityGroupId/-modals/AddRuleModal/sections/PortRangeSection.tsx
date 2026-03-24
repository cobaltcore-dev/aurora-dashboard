import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"

interface PortRangeSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function PortRangeSection({ form, disabled = false }: PortRangeSectionProps) {
  const { t } = useLingui()

  return (
    <FormRow className="mb-6">
      <div className="flex items-center gap-4">
        <form.Field name="portFrom">
          {(portFromField) => {
            return (
              <div className="flex-1">
                <TextInput
                  id="portFrom"
                  name="portFrom"
                  label={t`Port (from)`}
                  value={portFromField.state.value || ""}
                  onChange={(e) => portFromField.handleChange(e.target.value)}
                  errortext={portFromField.state.meta.errors[0]?.message}
                  disabled={disabled}
                  required
                />
              </div>
            )
          }}
        </form.Field>
        <div className="text-theme-secondary flex items-center justify-center">—</div>
        <form.Field name="portTo">
          {(portToField) => (
            <div className="flex-1">
              <TextInput
                id="portTo"
                name="portTo"
                label={t`Port (to)`}
                value={portToField.state.value || ""}
                onChange={(e) => portToField.handleChange(e.target.value)}
                errortext={portToField.state.meta.errors[0]?.message}
                placeholder=""
                disabled={disabled}
              />
            </div>
          )}
        </form.Field>
      </div>
      <p className="text-theme-secondary mt-2 text-sm">
        {t`Enter a single port, or define a range by also filling "Port (to)". "Port (to)" is optional.`}
      </p>
    </FormRow>
  )
}
