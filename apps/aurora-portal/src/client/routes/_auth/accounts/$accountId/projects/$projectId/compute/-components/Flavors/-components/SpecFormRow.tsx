import React from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, TextInput, ButtonRow, Button } from "@cloudoperators/juno-ui-components"

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
    <DataGridRow>
      <DataGridCell className="pl-0">
        <TextInput
          value={specKey}
          onChange={(e) => onKeyChange(e.target.value)}
          placeholder={t`Enter key`}
          errortext={errors.key}
          required
        />
      </DataGridCell>
      <DataGridCell className="pl-0">
        <TextInput
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={t`Enter value`}
          errortext={errors.value}
          required
        />
      </DataGridCell>
      <DataGridCell>
        <ButtonRow>
          <Button icon="check" onClick={onSave} variant="primary" title={t`Save Extra Spec`} disabled={isLoading} />
          <Button icon="cancel" onClick={onCancel} title={t`Cancel`} disabled={isLoading} />
        </ButtonRow>
      </DataGridCell>
    </DataGridRow>
  )
}
