import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { SECRETS_COLUMNS, SECRETS_COLUMN_COUNT } from "./constants"
import { SecretTableRow } from "./SecretTableRow"
import type { Secret } from "@/server/KeyManager/types/keyManager"

interface SecretListContainerProps {
  secrets: Secret[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  canDelete: boolean
  onShowDetails: (secret: Secret) => void
  onDelete: (secret: Secret) => void
}

export function SecretListContainer({
  secrets,
  isLoading,
  isError,
  error,
  canDelete,
  onShowDetails,
  onDelete,
}: SecretListContainerProps) {
  const { t } = useLingui()

  if (isLoading) {
    return <Status status="progress" title={t`Loading Secrets...`} />
  }

  if (isError) {
    return <Status status="error" title={error?.message ?? t`Failed to Load Secrets`} />
  }

  return (
    <DataGrid columns={SECRETS_COLUMN_COUNT} minContentColumns={[SECRETS_COLUMN_COUNT - 1]}>
      <DataGridRow>
        {SECRETS_COLUMNS.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {secrets.length > 0 ? (
        secrets.map((secret) => (
          <SecretTableRow
            key={secret.secret_ref}
            secret={secret}
            canDelete={canDelete}
            onShowDetails={onShowDetails}
            onDelete={onDelete}
          />
        ))
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={SECRETS_COLUMN_COUNT}>
            <Status
              status="empty"
              title={t`No Secrets Found`}
              body={t`There are no secrets in this project. Create one to get started.`}
            />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}
