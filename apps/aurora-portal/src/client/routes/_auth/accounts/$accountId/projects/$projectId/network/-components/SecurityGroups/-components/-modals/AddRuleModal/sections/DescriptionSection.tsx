import { FormRow, Textarea } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface DescriptionSectionProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  disabled?: boolean
}

export function DescriptionSection({ value, onChange, disabled = false }: DescriptionSectionProps) {
  const { t } = useLingui()

  return (
    <FormRow className="mb-0">
      <Textarea
        id="description"
        name="description"
        label={t`Description`}
        value={value}
        onChange={onChange}
        placeholder={t`Optional description`}
        disabled={disabled}
        rows={2}
      />
    </FormRow>
  )
}
