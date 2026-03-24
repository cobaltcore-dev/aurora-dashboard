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
    <form.Field name="ruleType">
      {(field) => (
        <FormRow className="mb-6">
          <Select
            id="ruleType"
            label={t`Rule Type`}
            value={field.state.value}
            onChange={(value) => field.handleChange(String(value || "ssh"))}
            disabled={disabled}
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
