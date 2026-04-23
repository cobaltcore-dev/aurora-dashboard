import { FormRow, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { RULE_PRESETS } from "../rulePresets"
import type { AddRuleFormApi } from "../AddRuleModal"

interface RuleTypeSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function RuleTypeSection({ form, disabled = false }: RuleTypeSectionProps) {
  const { t } = useLingui()

  return (
    <form.Field name="ruleType" mode="value">
      {(field) => (
        <FormRow className="mb-6">
          <Select
            id="ruleType"
            label={t`Rule Type`}
            value={field.state.value}
            onChange={(value) => {
              const newRuleType = String(value || "")
              field.handleChange(newRuleType)

              // Don't update dependent fields if no preset is selected
              if (!newRuleType) {
                form.setFieldValue("protocol", null)
                form.setFieldValue("portFrom", "")
                form.setFieldValue("portTo", "")
                form.setFieldValue("icmpType", "")
                form.setFieldValue("icmpCode", "")
                return
              }

              // Update dependent fields when preset changes
              const selectedPreset = RULE_PRESETS.find((p) => p.value === newRuleType)
              if (!selectedPreset) return

              // Update protocol field
              form.setFieldValue("protocol", selectedPreset.protocol)

              // For TCP/UDP presets: update port fields
              if (selectedPreset.protocol === "tcp" || selectedPreset.protocol === "udp") {
                if (selectedPreset.portRangeMin !== null && selectedPreset.portRangeMax !== null) {
                  // Preset has predefined ports (e.g., HTTP = 80)
                  form.setFieldValue("portFrom", String(selectedPreset.portRangeMin))
                  form.setFieldValue("portTo", String(selectedPreset.portRangeMax))
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

              // Clear ICMP fields for non-ICMP protocols
              if (selectedPreset.protocol !== "icmp" && selectedPreset.protocol !== "ipv6-icmp") {
                form.setFieldValue("icmpType", "")
                form.setFieldValue("icmpCode", "")
              }
            }}
            disabled={disabled}
          >
            {RULE_PRESETS.map((preset) => {
              // Render placeholder option with translation
              if (preset.value === "") {
                return <SelectOption key={preset.value} value={preset.value} label={t`Select a rule type...`} />
              }
              return <SelectOption key={preset.value} value={preset.value} label={preset.label} />
            })}
          </Select>
        </FormRow>
      )}
    </form.Field>
  )
}
