import React, { useState, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"

interface SpecRowProps {
  specKey: string
  value: string
  isDeleting: boolean
  onDelete: () => void
}

export const SpecRow: React.FC<SpecRowProps> = ({ specKey, value, isDeleting, onDelete }) => {
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
    if (confirm) {
      return (
        <Button
          variant="primary-danger"
          onClick={handleConfirmDelete}
          title={t`Delete`}
          aria-label={t`Delete`}
          data-testid="confirm-deletion"
          disabled={isDeleting}
        >
          {t`Delete`}
        </Button>
      )
    } else {
      return (
        <Button
          icon="deleteForever"
          onClick={() => setConfirm(true)}
          title={t`Delete ${specKey}`}
          aria-label={t`Delete ${specKey}`}
          data-testid={`delete-${specKey}`}
          disabled={isDeleting}
        />
      )
    }
  }

  return (
    <DataGridRow>
      <DataGridCell>{specKey}</DataGridCell>
      <DataGridCell>{value}</DataGridCell>
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
