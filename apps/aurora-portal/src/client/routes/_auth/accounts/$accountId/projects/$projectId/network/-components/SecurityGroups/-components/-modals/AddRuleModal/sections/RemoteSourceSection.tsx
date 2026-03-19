import { FormRow, TextInput, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { DEFAULT_IPV4_CIDR, DEFAULT_IPV6_CIDR } from "../constants"

interface RemoteSourceSectionProps {
  remoteSourceType: "cidr" | "security_group"
  remoteCidr: string
  remoteSecurityGroupId: string
  ethertype: "IPv4" | "IPv6"
  errors: { remoteCidr?: string }
  availableSecurityGroups: Array<{ id: string; name: string | null }>
  onRemoteSourceTypeChange: (value: string | number | string[] | undefined) => void
  onRemoteSecurityGroupChange: (value: string | number | string[] | undefined) => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export function RemoteSourceSection({
  remoteSourceType,
  remoteCidr,
  remoteSecurityGroupId,
  ethertype,
  errors,
  availableSecurityGroups,
  onRemoteSourceTypeChange,
  onRemoteSecurityGroupChange,
  onInputChange,
  disabled = false,
}: RemoteSourceSectionProps) {
  const { t } = useLingui()

  return (
    <>
      {/* Remote Source Type Toggle */}
      <FormRow className="mb-6">
        <Select
          id="remoteSourceType"
          label={t`Remote Source`}
          value={remoteSourceType}
          onChange={onRemoteSourceTypeChange}
          disabled={disabled}
        >
          <SelectOption value="cidr" label={t`CIDR`} />
          <SelectOption value="security_group" label={t`Security Group`} />
        </Select>
      </FormRow>

      {/* Remote CIDR (conditional) */}
      {remoteSourceType === "cidr" && (
        <FormRow className="mb-6">
          <TextInput
            id="remoteCidr"
            name="remoteCidr"
            label={t`Remote IP Prefix`}
            value={remoteCidr}
            onChange={onInputChange}
            errortext={errors.remoteCidr}
            placeholder={ethertype === "IPv4" ? DEFAULT_IPV4_CIDR : DEFAULT_IPV6_CIDR}
            disabled={disabled}
          />
        </FormRow>
      )}

      {/* Remote Security Group (conditional) */}
      {remoteSourceType === "security_group" && (
        <FormRow className="mb-6">
          <Select
            id="remoteSecurityGroupId"
            label={t`Remote Security Group`}
            value={remoteSecurityGroupId}
            onChange={onRemoteSecurityGroupChange}
            disabled={disabled}
          >
            <SelectOption value="" label={t`Select a security group...`} />
            {availableSecurityGroups.map((sg) => (
              <SelectOption key={sg.id} value={sg.id} label={sg.name || sg.id} />
            ))}
          </Select>
        </FormRow>
      )}
    </>
  )
}
