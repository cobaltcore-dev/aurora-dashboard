import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { CONTAINERS_COLUMNS, CONTAINERS_COLUMN_COUNT } from "./constants"
import { ContainerTableRow } from "./ContainerTableRow"
import type { Container } from "@/server/KeyManager/types/keyManager"

interface ContainerListContainerProps {
  containers: Container[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  canDeleteContainer: boolean
  onShowDetails: (container: Container) => void
  onDelete: (container: Container) => void
}

export function ContainerListContainer({
  containers,
  isLoading,
  isError,
  error,
  canDeleteContainer,
  onShowDetails,
  onDelete,
}: ContainerListContainerProps) {
  const { t } = useLingui()

  if (isLoading) {
    return <Status status="progress" title={t`Loading Containers...`} />
  }

  if (isError) {
    return <Status status="error" title={error?.message ?? t`Failed to Load Containers`} />
  }

  return (
    <DataGrid columns={CONTAINERS_COLUMN_COUNT} minContentColumns={[CONTAINERS_COLUMN_COUNT - 1]}>
      <DataGridRow>
        {CONTAINERS_COLUMNS.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {containers.length > 0 ? (
        containers.map((container) => (
          <ContainerTableRow
            key={container.container_ref}
            container={container}
            canDeleteContainer={canDeleteContainer}
            onShowDetails={onShowDetails}
            onDelete={onDelete}
          />
        ))
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={CONTAINERS_COLUMN_COUNT}>
            <Status
              status="empty"
              title={t`No Containers Found`}
              body={t`There are no containers in this project. Create one to group your secrets.`}
            />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}
