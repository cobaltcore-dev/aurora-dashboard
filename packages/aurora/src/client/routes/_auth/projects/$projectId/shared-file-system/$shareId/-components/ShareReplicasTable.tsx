import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { ShareReplica } from "@/server/SharedFileSystem/types/share"
import ClipboardText from "@/client/components/ClipboardText"
import { StatusLabel } from "@/client/components/StatusLabel"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import { sortShareReplicas, getReplicaStateLabel } from "./shareDetailUtils"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"

const COLUMN_COUNT = 5

interface ShareReplicasTableProps {
  replicas: ShareReplica[]
  isLoading: boolean
  error: { message?: string; data?: { code?: string } | null } | null
  canList: boolean
  onRetry: () => void
}

export const ShareReplicasTable = ({ replicas, isLoading, error, canList, onRetry }: ShareReplicasTableProps) => {
  const { t } = useLingui()

  return (
    <Stack direction="vertical" className="juno-pattern-datagrid-outer">
      <DataGrid columns={COLUMN_COUNT} cellVerticalAlignment="top" data-testid="share-replicas-table">
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Replica State</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Status</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Availability Zone</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Created</Trans>
          </DataGridHeadCell>
        </DataGridRow>

        {/* DT-7: State rows */}
        {!canList || error?.data?.code === "FORBIDDEN" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Access Denied`}
                body={t`You don't have permission to view the replicas of this share.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : isLoading ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="progress" title={t`Loading Replicas...`} />
            </DataGridCell>
          </DataGridRow>
        ) : error?.data?.code === "UNAUTHORIZED" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Session Expired`}
                body={t`Your session has expired. Sign in again to view replicas.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : error ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Failed to Load Replicas`}
                body={t`The replicas could not be loaded.`}
                action={<Button size="xs" label={t`Try Again`} onClick={onRetry} />}
              />
            </DataGridCell>
          </DataGridRow>
        ) : replicas.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="empty" title={t`No Replicas for This Share`} body={t`This share has no replicas.`} />
            </DataGridCell>
          </DataGridRow>
        ) : (
          sortShareReplicas(replicas).map((replica) => {
            const stateLabel = getReplicaStateLabel(replica.replica_state)
            const createdDate = parseManilaTimestamp(replica.created_at)
            const createdLabel = createdDate?.toLocaleString() ?? EMPTY_VALUE

            return (
              <DataGridRow key={replica.id}>
                {/* ID */}
                <DataGridCell>
                  <ClipboardText text={replica.id} />
                </DataGridCell>

                {/* Replica State */}
                <DataGridCell>
                  {stateLabel ? t(stateLabel) : <StatusLabel value={replica.replica_state} />}
                </DataGridCell>

                {/* Status */}
                <DataGridCell>
                  <StatusLabel value={replica.status} />
                </DataGridCell>

                {/* Availability Zone */}
                <DataGridCell>{replica.availability_zone || EMPTY_VALUE}</DataGridCell>

                {/* Created */}
                <DataGridCell>{createdLabel}</DataGridCell>
              </DataGridRow>
            )
          })
        )}
      </DataGrid>
    </Stack>
  )
}
