import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"

interface IcmpSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function IcmpSection({ form, disabled = false }: IcmpSectionProps) {
  const { t } = useLingui()

  return (
    <FormRow className="mb-6">
      <div className="flex gap-4">
        <form.Field name="icmpType">
          {(icmpTypeField) => (
            <TextInput
              id="icmpType"
              name="icmpType"
              label={t`ICMP Type`}
              value={icmpTypeField.state.value}
              onChange={(e) => icmpTypeField.handleChange(e.target.value)}
              errortext={icmpTypeField.state.meta.errors[0]?.message}
              placeholder={t`Leave empty for all types`}
              disabled={disabled}
            />
          )}
        </form.Field>
        <form.Field name="icmpCode">
          {(icmpCodeField) => (
            <TextInput
              id="icmpCode"
              name="icmpCode"
              label={t`ICMP Code`}
              value={icmpCodeField.state.value}
              onChange={(e) => icmpCodeField.handleChange(e.target.value)}
              errortext={icmpCodeField.state.meta.errors[0]?.message}
              placeholder={t`Leave empty for all codes`}
              disabled={disabled}
            />
          )}
        </form.Field>
      </div>
    </FormRow>
  )
}
