import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"
import { useRuleFieldError, hideRuleFieldError } from "../validation/fieldErrors"

interface IcmpSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function IcmpSection({ form, disabled = false }: IcmpSectionProps) {
  const { t } = useLingui()
  const icmpTypeError = useRuleFieldError(form, "icmpType")
  const icmpCodeError = useRuleFieldError(form, "icmpCode")

  return (
    <FormRow>
      <div className="flex w-full gap-4">
        <form.Field name="icmpType">
          {(icmpTypeField) => (
            <div className="flex-1">
              <TextInput
                id="icmpType"
                name="icmpType"
                label={t`ICMP Type`}
                value={icmpTypeField.state.value}
                onChange={(e) => {
                  icmpTypeField.handleChange(e.target.value)
                  hideRuleFieldError(form, "icmpType")
                }}
                onBlur={icmpTypeField.handleBlur}
                errortext={icmpTypeError}
                helptext={t`0-255. Leave empty to allow all types.`}
                disabled={disabled}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="icmpCode">
          {(icmpCodeField) => (
            <div className="flex-1">
              <TextInput
                id="icmpCode"
                name="icmpCode"
                label={t`ICMP Code`}
                value={icmpCodeField.state.value}
                onChange={(e) => {
                  icmpCodeField.handleChange(e.target.value)
                  hideRuleFieldError(form, "icmpCode")
                }}
                onBlur={icmpCodeField.handleBlur}
                errortext={icmpCodeError}
                helptext={t`0-255. Leave empty to allow all codes. Requires an ICMP type.`}
                disabled={disabled}
              />
            </div>
          )}
        </form.Field>
      </div>
    </FormRow>
  )
}
