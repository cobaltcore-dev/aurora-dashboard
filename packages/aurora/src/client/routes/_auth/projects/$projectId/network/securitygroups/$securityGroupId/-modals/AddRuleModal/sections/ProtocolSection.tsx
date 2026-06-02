import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"

interface ProtocolSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function ProtocolSection({ form, disabled = false }: ProtocolSectionProps) {
  const { t } = useLingui()

  return (
    <form.Field name="protocol">
      {(field) => (
        <FormRow className="mb-6">
          <TextInput
            id="protocol"
            name="protocol"
            label={t`Protocol`}
            value={field.state.value || ""}
            onChange={(e) => field.handleChange(e.target.value || null)}
            errortext={field.state.meta.errors[0]?.message}
            placeholder={t`tcp, udp, icmp, or protocol number`}
            disabled={disabled}
          />
        </FormRow>
      )}
    </form.Field>
  )
}
