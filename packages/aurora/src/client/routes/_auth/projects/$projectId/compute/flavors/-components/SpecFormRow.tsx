import React from "react"
import { useLingui } from "@lingui/react/macro"
import { TextInput, ButtonRow, Button, Stack } from "@cloudoperators/juno-ui-components"

interface SpecFormRowProps {
  specKey: string
  value: string
  errors: { key?: string; value?: string }
  isLoading: boolean
  onKeyChange: (key: string) => void
  onValueChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export const SpecFormRow: React.FC<SpecFormRowProps> = ({
  specKey,
  value,
  errors,
  isLoading,
  onKeyChange,
  onValueChange,
  onSave,
  onCancel,
}) => {
  const { t } = useLingui()

  return (
    <Stack gap="4" direction="horizontal" alignment="start" className="border-theme-background-lvl-3 border-b p-4">
      <TextInput
        value={specKey}
        onChange={(e) => onKeyChange(e.target.value)}
        placeholder={t`Enter key`}
        errortext={errors.key}
        label={t`Key`}
        required
      />
      <TextInput
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={t`Enter value`}
        errortext={errors.value}
        label={t`Value`}
        required
      />
      <ButtonRow className="mt-6">
        <Button icon="check" onClick={onSave} variant="primary" title={t`Save Metadata`} disabled={isLoading} />
        <Button icon="cancel" onClick={onCancel} title={t`Cancel`} disabled={isLoading} />
      </ButtonRow>
    </Stack>
  )
}
