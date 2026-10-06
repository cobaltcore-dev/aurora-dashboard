import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { useStore } from "@tanstack/react-form"
import type { AddRuleFormApi } from "../AddRuleModal"
import { useRuleFieldError, hideRuleFieldError } from "../validation/fieldErrors"

interface PortRangeSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
  readOnly?: boolean
}

export function PortRangeSection({ form, disabled = false, readOnly = false }: PortRangeSectionProps) {
  const { t } = useLingui()

  // Watch portFrom value using useStore
  const portFromValue = useStore(form.store, (state) => state.values.portFrom)

  const portFromError = useRuleFieldError(form, "portFrom")
  const portToError = useRuleFieldError(form, "portTo")

  // Determine if portTo should be disabled based on portFrom value
  const isPortFromDisabled = disabled || readOnly
  const isPortToDisabled = isPortFromDisabled || !portFromValue || portFromValue.trim() === ""

  return (
    <FormRow>
      <div className="flex w-full gap-4">
        <form.Field name="portFrom">
          {(portFromField) => (
            <div className="flex-1">
              <TextInput
                id="portFrom"
                name="portFrom"
                label={t`Port (from)`}
                value={portFromField.state.value || ""}
                onChange={(e) => {
                  const newValue = e.target.value
                  portFromField.handleChange(newValue)
                  hideRuleFieldError(form, "portFrom")

                  if (!newValue || newValue.trim() === "") {
                    form.setFieldValue("portTo", "")
                  }
                }}
                onBlur={portFromField.handleBlur}
                errortext={portFromError}
                helptext={
                  readOnly
                    ? t`Set by the preset. Use a custom TCP or UDP rule to change the ports.`
                    : t`Single port or start of a range, 1-65535.`
                }
                disabled={isPortFromDisabled}
                required={!readOnly}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="portTo">
          {(portToField) => (
            <div className="flex-1">
              <TextInput
                id="portTo"
                name="portTo"
                label={t`Port (to)`}
                value={portToField.state.value || ""}
                onChange={(e) => {
                  portToField.handleChange(e.target.value)
                  hideRuleFieldError(form, "portTo")
                }}
                onBlur={portToField.handleBlur}
                errortext={portToError}
                helptext={readOnly ? undefined : t`End of the range. Leave empty for a single port.`}
                disabled={isPortToDisabled}
              />
            </div>
          )}
        </form.Field>
      </div>
    </FormRow>
  )
}
