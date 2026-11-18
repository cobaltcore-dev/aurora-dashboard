import { FormRow, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
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
    // #1426: a titled section like Direction and Remote; the field label doesn't repeat the title
    <FormSection title={t`Protocol`}>
      <form.Field name="protocol">
        {(field) => (
          <FormRow>
            <TextInput
              id="protocol"
              name="protocol"
              label={t`Name or number`}
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
    </FormSection>
  )
}
