import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface ProtocolSectionProps {
  value: string | null
  error?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export function ProtocolSection({ value, error, onChange, disabled = false }: ProtocolSectionProps) {
  const { t } = useLingui()

  return (
    <FormRow className="mb-6">
      <TextInput
        id="protocol"
        name="protocol"
        label={t`Protocol`}
        value={value || ""}
        onChange={onChange}
        errortext={error}
        placeholder={t`tcp, udp, icmp, or protocol number`}
        disabled={disabled}
      />
    </FormRow>
  )
}
