import { FormRow, TextInput, Select, SelectOption, RadioGroup, Radio } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { DEFAULT_IPV4_CIDR, DEFAULT_IPV6_CIDR } from "../constants"
import type { AddRuleFormApi } from "../AddRuleModal"

interface RemoteSourceSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
  availableSecurityGroups: Array<{ id: string; name: string | null }>
}

export function RemoteSourceSection({ form, disabled = false, availableSecurityGroups }: RemoteSourceSectionProps) {
  const { t } = useLingui()

  return (
    <>
      {/* Remote Source Type Toggle */}
      <form.Field name="remoteSourceType" mode="value">
        {(remoteSourceTypeField) => (
          <FormRow className="mb-1">
            <RadioGroup
              name="remoteSourceType"
              label={t`Remote Source`}
              selected={remoteSourceTypeField.state.value}
              onChange={(value) => {
                const newValue = String(value) as "cidr" | "security_group"
                remoteSourceTypeField.handleChange(newValue)

                // Auto-set ethertype to IPv4 when remote source is NOT security group
                if (newValue !== "security_group") {
                  form.setFieldValue("ethertype", "IPv4")
                }
              }}
              disabled={disabled}
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
                <form.Field name="ethertype">
                  {(ethertypeField) => (
                    <FormRow className="mb-6">
                      <TextInput
                        id="remoteCidr"
                        name="remoteCidr"
                        label={t`Remote IP Prefix`}
                        value={remoteCidrField.state.value}
                        onChange={(e) => remoteCidrField.handleChange(e.target.value)}
                        errortext={remoteCidrField.state.meta.errors[0]?.message}
                        placeholder={ethertypeField.state.value === "IPv4" ? DEFAULT_IPV4_CIDR : DEFAULT_IPV6_CIDR}
                        disabled={disabled}
                      />
                    </FormRow>
                  )}
                </form.Field>
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
                <FormRow className="mb-6">
                  <Select
                    id="remoteSecurityGroupId"
                    label={t`Remote Security Group`}
                    value={remoteSecurityGroupIdField.state.value}
                    onChange={(value) => remoteSecurityGroupIdField.handleChange(String(value))}
                    disabled={disabled}
                  >
                    <SelectOption value="" label={t`Select a security group...`} />
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
