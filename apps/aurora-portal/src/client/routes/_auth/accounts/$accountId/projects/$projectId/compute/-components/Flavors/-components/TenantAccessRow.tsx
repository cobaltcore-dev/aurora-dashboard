import React, { useState, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"

interface FlavorAccess {
  flavor_id: string
  tenant_id: string
}

interface TenantAccessRowProps {
  access: FlavorAccess
  isDeleting: boolean
  onDelete: () => void
  canDelete: boolean
}

export const TenantAccessRow: React.FC<TenantAccessRowProps> = ({ access, isDeleting, onDelete, canDelete }) => {
  const { t } = useLingui()
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (confirm) {
      const timer = setTimeout(() => {
        setConfirm(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [confirm])

  const handleConfirmDelete = () => {
    setConfirm(false)
    onDelete()
  }

  const button = () => {
    if (!canDelete) {
      return <></>
    }
    if (confirm) {
      return (
        <Button
          variant="primary-danger"
          onClick={handleConfirmDelete}
          title={t`Remove tenant access`}
          aria-label={t`Remove tenant access`}
          data-testid="confirm-removal"
          disabled={isDeleting}
        >
          {t`Remove`}
        </Button>
      )
    } else {
      return (
        <Button
          icon="deleteForever"
          onClick={() => setConfirm(true)}
          title={t`Remove access for ${access.tenant_id}`}
          aria-label={t`Remove access for ${access.tenant_id}`}
          data-testid={`remove-${access.tenant_id}`}
          disabled={isDeleting}
        />
      )
    }
  }

  return (
    <DataGridRow>
      <DataGridCell>{access.flavor_id}</DataGridCell>
      <DataGridCell className="break-all">{access.tenant_id}</DataGridCell>
      <DataGridCell>
        {isDeleting ? (
          <Stack distribution="center" alignment="center">
            <Spinner variant="primary" />
          </Stack>
        ) : (
          button()
        )}
      </DataGridCell>
    </DataGridRow>
  )
}
