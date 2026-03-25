import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { useStore } from "@tanstack/react-form"
import type { AddRuleFormApi } from "../AddRuleModal"

interface PortRangeSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function PortRangeSection({ form, disabled = false }: PortRangeSectionProps) {
  const { t } = useLingui()

  // Watch portFrom value using useStore
  const portFromValue = useStore(form.store, (state) => state.values.portFrom)

  // Watch field errors using useStore
  const portFromError = useStore(form.store, (state) => state.fieldMeta.portFrom?.errors[0]?.message)
  const portToError = useStore(form.store, (state) => state.fieldMeta.portTo?.errors[0]?.message)

  // Determine if portTo should be disabled based on portFrom value
  const isPortToDisabled = disabled || !portFromValue || portFromValue.trim() === ""

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
                  onChange={(e) => {
                    const newValue = e.target.value
                    portFromField.handleChange(newValue)

                    // Clear portTo when portFrom is cleared
                    if (!newValue || newValue.trim() === "") {
                      form.setFieldValue("portTo", "")
                    }

                    // Trigger validation of portTo when portFrom changes
                    // This ensures cross-field validation (portFrom < portTo) updates immediately
                    form.validateField("portTo", "change")
                  }}
                  disabled={disabled}
                  required
                />
              </div>
            )
          }}
        </form.Field>
        <div className="text-theme-secondary flex items-center justify-center">—</div>
        <form.Field name="portTo">
          {(portToField) => {
            return (
              <div className="flex-1">
                <TextInput
                  id="portTo"
                  name="portTo"
                  label={t`Port (to)`}
                  value={portToField.state.value || ""}
                  onChange={(e) => {
                    portToField.handleChange(e.target.value)

                    // Trigger validation of portFrom when portTo changes
                    // This ensures cross-field validation (portFrom < portTo) updates immediately
                    form.validateField("portFrom", "change")
                  }}
                  placeholder=""
                  disabled={isPortToDisabled}
                />
              </div>
            )
          }}
        </form.Field>
      </div>

      {/* Display errors before description */}
      {(portFromError || portToError) && (
        <div className="text-theme-error mt-2 text-sm">
          {portFromError && <div>{portFromError}</div>}
          {portToError && <div>{portToError}</div>}
        </div>
      )}

      <p className="mt-2 text-sm">
        {t`Enter a single port, or define a range by also filling "Port (to)". "Port (to)" is optional.`}
      </p>
    </FormRow>
  )
}
