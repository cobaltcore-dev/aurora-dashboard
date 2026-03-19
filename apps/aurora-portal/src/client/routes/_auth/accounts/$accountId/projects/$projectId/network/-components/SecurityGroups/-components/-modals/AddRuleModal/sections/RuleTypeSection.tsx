import { FormRow, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { RULE_PRESETS } from "../rulePresets"

interface RuleTypeSectionProps {
  value: string
  onChange: (value: string | number | string[] | undefined) => void
  disabled?: boolean
}

export function RuleTypeSection({ value, onChange, disabled = false }: RuleTypeSectionProps) {
  const { t } = useLingui()

  return (
    <FormRow className="mb-6">
      <Select id="ruleType" label={t`Rule Type`} value={value} onChange={onChange} disabled={disabled}>
        {RULE_PRESETS.map((preset) => (
          <SelectOption key={preset.value} value={preset.value} label={preset.label} />
        ))}
      </Select>
    </FormRow>
  )
}
