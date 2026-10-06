import { FormRow, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { RULE_PRESETS } from "../rulePresets"
import { useRuleFieldError } from "../validation/fieldErrors"
import type { AddRuleFormApi } from "../AddRuleModal"

interface RuleTypeSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function RuleTypeSection({ form, disabled = false }: RuleTypeSectionProps) {
  const { t } = useLingui()
  const ruleTypeError = useRuleFieldError(form, "ruleType")

  return (
    <form.Field name="ruleType" mode="value">
      {(field) => (
        <FormRow>
          <Select
            id="ruleType"
            label={t`Rule Type`}
            value={field.state.value}
            onChange={(value) => {
              const newRuleType = String(value || "")
              field.handleChange(newRuleType)

              // Update dependent fields when preset changes
              const selectedPreset = RULE_PRESETS.find((p) => p.value === newRuleType)
              if (!selectedPreset) return

              // Update protocol field
              form.setFieldValue("protocol", selectedPreset.protocol)

              // For TCP/UDP presets: update port fields
              if (selectedPreset.protocol === "tcp" || selectedPreset.protocol === "udp") {
                if (selectedPreset.portRangeMin !== null && selectedPreset.portRangeMax !== null) {
                  // Preset has predefined ports (e.g., HTTP = 80). A single port leaves "Port (to)" empty,
                  // the same way a custom rule enters one
                  form.setFieldValue("portFrom", String(selectedPreset.portRangeMin))
                  form.setFieldValue(
                    "portTo",
                    selectedPreset.portRangeMax !== selectedPreset.portRangeMin
                      ? String(selectedPreset.portRangeMax)
                      : ""
                  )
                } else {
                  // Custom rule - clear ports so user can enter them
                  form.setFieldValue("portFrom", "")
                  form.setFieldValue("portTo", "")
                }
              } else {
                // Non-TCP/UDP protocols: clear port fields
                form.setFieldValue("portFrom", "")
                form.setFieldValue("portTo", "")
              }

              // No preset carries an ICMP type/code: start from "all types and codes" on every change
              form.setFieldValue("icmpType", "")
              form.setFieldValue("icmpCode", "")
            }}
            onBlur={field.handleBlur}
            disabled={disabled}
            placeholder={t`Select a rule type...`}
            required
            errortext={ruleTypeError}
            helptext={t`Service presets fill in the protocol and port. Use a custom TCP or UDP rule to set the ports, a custom ICMP rule to set the ICMP type and code, or Other Protocol for any other protocol.`}
          >
            {RULE_PRESETS.map((preset) => (
              <SelectOption key={preset.value} value={preset.value} label={preset.label} />
            ))}
          </Select>
        </FormRow>
      )}
    </form.Field>
  )
}
