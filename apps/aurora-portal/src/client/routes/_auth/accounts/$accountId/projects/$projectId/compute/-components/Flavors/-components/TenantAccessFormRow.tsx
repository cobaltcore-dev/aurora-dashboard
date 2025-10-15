import React from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, TextInput, ButtonRow, Button } from "@cloudoperators/juno-ui-components"

interface TenantAccessFormRowProps {
  tenantId: string
  flavorId: string
  errors: { tenantId?: string }
  isLoading: boolean
  onTenantIdChange: (tenantId: string) => void
  onSave: () => void
  onCancel: () => void
}

export const TenantAccessFormRow: React.FC<TenantAccessFormRowProps> = ({
  tenantId,
  flavorId,
  errors,
  isLoading,
  onTenantIdChange,
  onSave,
  onCancel,
}) => {
  const { t } = useLingui()

  return (
    <DataGridRow>
      <DataGridCell>{flavorId}</DataGridCell>
      <DataGridCell className="pl-0">
        <TextInput
          value={tenantId}
          onChange={(e) => onTenantIdChange(e.target.value)}
          placeholder={t`Enter tenant ID`}
          errortext={errors.tenantId}
          required
        />
      </DataGridCell>
      <DataGridCell>
        <ButtonRow>
          <Button icon="check" onClick={onSave} variant="primary" title={t`Add Tenant Access`} disabled={isLoading} />
          <Button icon="cancel" onClick={onCancel} title={t`Cancel`} disabled={isLoading} />
        </ButtonRow>
      </DataGridCell>
    </DataGridRow>
  )
}
