import { FormRow, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface DirectionEthertypeSectionProps {
  direction: "ingress" | "egress"
  ethertype: "IPv4" | "IPv6"
  onDirectionChange: (value: string | number | string[] | undefined) => void
  onEthertypeChange: (value: string | number | string[] | undefined) => void
  disabled?: boolean
}

export function DirectionEthertypeSection({
  direction,
  ethertype,
  onDirectionChange,
  onEthertypeChange,
  disabled = false,
}: DirectionEthertypeSectionProps) {
  const { t } = useLingui()

  return (
    <>
      {/* Direction */}
      <FormRow className="mb-6">
        <Select
          id="direction"
          label={t`Direction`}
          value={direction}
          onChange={onDirectionChange}
          required
          disabled={disabled}
        >
          <SelectOption value="ingress" label={t`Ingress (Inbound)`} />
          <SelectOption value="egress" label={t`Egress (Outbound)`} />
        </Select>
      </FormRow>

      {/* Ethertype */}
      <FormRow className="mb-6">
        <Select id="ethertype" label={t`IP Version`} value={ethertype} onChange={onEthertypeChange} disabled={disabled}>
          <SelectOption value="IPv4" label="IPv4" />
          <SelectOption value="IPv6" label="IPv6" />
        </Select>
      </FormRow>
    </>
  )
}
