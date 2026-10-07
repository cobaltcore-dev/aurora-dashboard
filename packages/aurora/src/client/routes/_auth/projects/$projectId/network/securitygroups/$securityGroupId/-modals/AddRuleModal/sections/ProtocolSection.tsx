import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"
import { useRuleFieldError, hideRuleFieldError } from "../validation/fieldErrors"

interface ProtocolSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function ProtocolSection({ form, disabled = false }: ProtocolSectionProps) {
  const { t } = useLingui()
  const protocolError = useRuleFieldError(form, "protocol")

  return (
    <form.Field name="protocol">
      {(field) => (
        <FormRow>
          <TextInput
            id="protocol"
            name="protocol"
            label={t`Protocol`}
            value={field.state.value || ""}
            onChange={(e) => {
              field.handleChange(e.target.value || null)
              hideRuleFieldError(form, "protocol")
            }}
            onBlur={field.handleBlur}
            required
            errortext={protocolError}
            helptext={t`Protocol name (e.g. tcp, udp, icmp, gre) or IP protocol number 0-255.`}
            disabled={disabled}
          />
        </FormRow>
      )}
    </form.Field>
  )
}
