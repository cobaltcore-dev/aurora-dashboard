import React from "react"
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
          <Button
            icon="deleteForever"
            variant="subdued"
            onClick={onDelete}
            title={t`Delete ${specKey}`}
            aria-label={t`Delete ${specKey}`}
            data-testid={`delete-${specKey}`}
            disabled={isDeleting}
          />
        )}
      </DataGridCell>
    </DataGridRow>
  )
}
