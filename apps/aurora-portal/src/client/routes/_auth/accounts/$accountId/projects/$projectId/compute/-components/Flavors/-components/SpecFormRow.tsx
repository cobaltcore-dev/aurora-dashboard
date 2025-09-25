import React from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, TextInput, ButtonRow, Button } from "@cloudoperators/juno-ui-components"
import { useSpecForm } from "./useSpecForm"

interface SpecFormRowProps {
  form: ReturnType<typeof useSpecForm>
  isLoading: boolean
  onSave: () => void
  onCancel: () => void
}

export const SpecFormRow: React.FC<SpecFormRowProps> = ({ form, isLoading, onSave, onCancel }) => {
  const { t } = useLingui()

  return (
    <DataGridRow>
      <DataGridCell className="pl-0">
        <TextInput
          value={form.key}
          onChange={(e) => form.updateKey(e.target.value)}
          onBlur={() => form.validate()}
          placeholder={t`Enter key`}
          errortext={form.errors.key}
          required
        />
      </DataGridCell>
      <DataGridCell className="pl-0">
        <TextInput
          value={form.value}
          onChange={(e) => form.updateValue(e.target.value)}
          onBlur={() => form.validate()}
          placeholder={t`Enter value`}
          errortext={form.errors.value}
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
