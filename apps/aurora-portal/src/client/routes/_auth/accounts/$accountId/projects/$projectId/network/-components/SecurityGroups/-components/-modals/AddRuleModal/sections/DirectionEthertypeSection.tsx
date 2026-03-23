import { FormRow, RadioGroup, Radio } from "@cloudoperators/juno-ui-components"
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
      <FormRow>
        <RadioGroup
          name="direction"
          label={t`Direction`}
          selected={direction}
          onChange={onDirectionChange}
          required
          disabled={disabled}
        >
          <div className="flex gap-4">
            <Radio value="ingress" label={t`Ingress`} />
            <Radio value="egress" label={t`Egress`} />
          </div>
        </RadioGroup>
      </FormRow>

      {/* Ethertype */}
      <FormRow>
        <RadioGroup
          name="ethertype"
          label={t`IP Version`}
          selected={ethertype}
          onChange={onEthertypeChange}
          required
          disabled={disabled}
        >
          <div className="flex gap-4">
            <Radio value="IPv4" label="IPv4" />
            <Radio value="IPv6" label="IPv6" />
          </div>
        </RadioGroup>
      </FormRow>
    </>
  )
}
