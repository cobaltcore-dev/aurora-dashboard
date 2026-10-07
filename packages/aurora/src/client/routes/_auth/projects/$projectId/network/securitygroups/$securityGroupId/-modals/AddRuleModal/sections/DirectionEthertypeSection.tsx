import { FormRow, RadioGroup, Radio } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"

interface DirectionSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function DirectionSection({ form, disabled = false }: DirectionSectionProps) {
  const { t } = useLingui()

  return (
    <form.Field name="direction">
      {(directionField) => (
        <FormRow>
          <RadioGroup
            name="direction"
            label={t`Direction`}
            selected={directionField.state.value}
            onChange={(value) => directionField.handleChange(String(value) as "ingress" | "egress")}
            required
            disabled={disabled}
            helptext={t`Ingress: traffic coming in to the instances. Egress: traffic going out of them.`}
          >
            <div className="flex gap-4">
              <Radio value="ingress" label={t`Ingress`} />
              <Radio value="egress" label={t`Egress`} />
            </div>
          </RadioGroup>
        </FormRow>
      )}
    </form.Field>
  )
}

interface EthertypeSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function EthertypeSection({ form, disabled = false }: EthertypeSectionProps) {
  const { t } = useLingui()

  return (
    <form.Field name="ethertype">
      {(ethertypeField) => (
        <FormRow>
          <RadioGroup
            name="ethertype"
            label={t`IP Version`}
            selected={ethertypeField.state.value}
            onChange={(value) => ethertypeField.handleChange(String(value) as "IPv4" | "IPv6")}
            required
            disabled={disabled}
            helptext={t`Whether the rule applies to IPv4 or IPv6 traffic.`}
          >
            <div className="flex gap-4">
              <Radio value="IPv4" label="IPv4" />
              <Radio value="IPv6" label="IPv6" />
            </div>
          </RadioGroup>
        </FormRow>
      )}
    </form.Field>
  )
}
