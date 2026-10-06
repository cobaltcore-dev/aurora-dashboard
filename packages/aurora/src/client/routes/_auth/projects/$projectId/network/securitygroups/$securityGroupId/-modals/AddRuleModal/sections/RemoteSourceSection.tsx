import { FormRow, TextInput, Select, SelectOption, RadioGroup, Radio } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { AddRuleFormApi } from "../AddRuleModal"
import { useRuleFieldError, hideRuleFieldError } from "../validation/fieldErrors"

interface RemoteSourceSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
  availableSecurityGroups: Array<{ id: string; name: string | null }>
}

export function RemoteSourceSection({ form, disabled = false, availableSecurityGroups }: RemoteSourceSectionProps) {
  const { t } = useLingui()
  const remoteCidrError = useRuleFieldError(form, "remoteCidr")
  const remoteSecurityGroupError = useRuleFieldError(form, "remoteSecurityGroupId")

  return (
    <>
      {/* Remote Source Type Toggle */}
      <form.Field name="remoteSourceType" mode="value">
        {(remoteSourceTypeField) => (
          <FormRow>
            <RadioGroup
              name="remoteSourceType"
              label={t`Remote`}
              selected={remoteSourceTypeField.state.value}
              onChange={(value) => remoteSourceTypeField.handleChange(String(value) as "cidr" | "security_group")}
              disabled={disabled}
              helptext={t`The other end of the traffic: where it comes from (ingress) or where it goes to (egress). CIDR is recommended.`}
            >
              <div className="flex gap-4">
                <Radio value="cidr" label={t`CIDR`} />
                <Radio value="security_group" label={t`Security Group`} />
              </div>
            </RadioGroup>
          </FormRow>
        )}
      </form.Field>

      {/* Remote CIDR (conditional) */}
      <form.Field name="remoteSourceType">
        {(remoteSourceTypeField) =>
          remoteSourceTypeField.state.value === "cidr" ? (
            <form.Field name="remoteCidr">
              {(remoteCidrField) => (
                <FormRow>
                  <TextInput
                    id="remoteCidr"
                    name="remoteCidr"
                    label={t`Remote IP Prefix`}
                    value={remoteCidrField.state.value}
                    onChange={(e) => {
                      remoteCidrField.handleChange(e.target.value)
                      hideRuleFieldError(form, "remoteCidr")
                    }}
                    onBlur={remoteCidrField.handleBlur}
                    errortext={remoteCidrError}
                    helptext={t`IPv4 or IPv6 CIDR, e.g. 10.0.0.0/24 or ::/0. Leave empty to allow any IPv4 address.`}
                    disabled={disabled}
                  />
                </FormRow>
              )}
            </form.Field>
          ) : null
        }
      </form.Field>

      {/* Remote Security Group (conditional) */}
      <form.Field name="remoteSourceType">
        {(remoteSourceTypeField) =>
          remoteSourceTypeField.state.value === "security_group" ? (
            <form.Field name="remoteSecurityGroupId">
              {(remoteSecurityGroupIdField) => (
                <FormRow>
                  <Select
                    id="remoteSecurityGroupId"
                    label={t`Remote Security Group`}
                    value={remoteSecurityGroupIdField.state.value}
                    onChange={(value) => remoteSecurityGroupIdField.handleChange(String(value))}
                    placeholder={t`Select a security group...`}
                    required
                    errortext={remoteSecurityGroupError}
                    helptext={t`Applies to traffic to or from any instance in the selected group.`}
                    disabled={disabled}
                  >
                    {availableSecurityGroups.map((sg) => (
                      <SelectOption key={sg.id} value={sg.id} label={sg.name || sg.id} />
                    ))}
                  </Select>
                </FormRow>
              )}
            </form.Field>
          ) : null
        }
      </form.Field>
    </>
  )
}
