import { FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface IcmpSectionProps {
  icmpType: string
  icmpCode: string
  errors: { icmpType?: string; icmpCode?: string }
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export function IcmpSection({ icmpType, icmpCode, errors, onChange, disabled = false }: IcmpSectionProps) {
  const { t } = useLingui()

  return (
    <FormRow className="mb-6">
      <div className="flex gap-4">
        <TextInput
          id="icmpType"
          name="icmpType"
          label={t`ICMP Type`}
          value={icmpType}
          onChange={onChange}
          errortext={errors.icmpType}
          placeholder={t`Leave empty for all types`}
          disabled={disabled}
        />
        <TextInput
          id="icmpCode"
          name="icmpCode"
          label={t`ICMP Code`}
          value={icmpCode}
          onChange={onChange}
          errortext={errors.icmpCode}
          placeholder={t`Leave empty for all codes`}
          disabled={disabled}
        />
      </div>
    </FormRow>
  )
}
