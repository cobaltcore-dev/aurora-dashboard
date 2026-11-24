import { useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { StatusLabel } from "@/client/components/StatusLabel"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import { sortShareSnapshots } from "./shareDetailUtils"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"

const COLUMN_COUNT = 5

interface ShareSnapshotsTableProps {
  snapshots: ShareSnapshot[]
  isLoading: boolean
  error: { message?: string; data?: { code?: string } | null } | null
  canList: boolean
  onRetry: () => void
}

interface ShareSnapshotRowProps {
  snapshot: ShareSnapshot
}

const ShareSnapshotRow = ({ snapshot }: ShareSnapshotRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const navigateToSnapshot = () => {
    navigate({
      to: "/projects/$projectId/shared-file-system/snapshots/$snapshotId",
      params: { projectId, snapshotId: snapshot.id },
    })
  }

  const createdDate = parseManilaTimestamp(snapshot.created_at)
  const createdLabel = createdDate?.toLocaleString() ?? EMPTY_VALUE

  return (
    <DataGridRow data-testid={`share-snapshot-row-${snapshot.id}`} onClick={navigateToSnapshot}>
      {/* Name / ID */}
      <DataGridCell>
        <Stack direction="vertical" gap="0.5" className="min-w-0">
          {snapshot.name ? (
            <>
              <span className="break-all">{snapshot.name}</span>
              <ClipboardText text={snapshot.id} className="text-theme-light text-sm" truncateAt={13} />
            </>
          ) : (
            <ClipboardText text={snapshot.id} truncateAt={13} />
          )}
        </Stack>
      </DataGridCell>

      {/* Status */}
      <DataGridCell>
        <StatusLabel value={snapshot.status} />
      </DataGridCell>

      {/* Size (GiB) */}
      <DataGridCell>{snapshot.size ?? EMPTY_VALUE}</DataGridCell>

      {/* Created */}
      <DataGridCell>{createdLabel}</DataGridCell>

      {/* Actions */}
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem
              label={t`Show Details`}
              onClick={(e) => {
                e.stopPropagation()
                navigateToSnapshot()
              }}
            />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

export const ShareSnapshotsTable = ({ snapshots, isLoading, error, canList, onRetry }: ShareSnapshotsTableProps) => {
  const { t } = useLingui()

  return (
    <Stack direction="vertical" className="juno-pattern-datagrid-outer">
      <DataGrid
        columns={COLUMN_COUNT}
        minContentColumns={[4]}
        cellVerticalAlignment="top"
        data-testid="share-snapshots-table"
      >
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name / ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Status</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Size (GiB)</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Created</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {/* DT-7: State rows */}
        {!canList || error?.data?.code === "FORBIDDEN" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Access Denied`}
                body={t`You don't have permission to view the snapshots of this share.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : isLoading ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="progress" title={t`Loading Snapshots...`} />
            </DataGridCell>
          </DataGridRow>
        ) : error?.data?.code === "UNAUTHORIZED" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Session Expired`}
                body={t`Your session has expired. Sign in again to view snapshots.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : error ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Failed to Load Snapshots`}
                body={t`The snapshots could not be loaded.`}
                action={<Button size="xs" label={t`Try Again`} onClick={onRetry} />}
              />
            </DataGridCell>
          </DataGridRow>
        ) : snapshots.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="empty" title={t`No Snapshots for This Share`} body={t`This share has no snapshots.`} />
            </DataGridCell>
          </DataGridRow>
        ) : (
          sortShareSnapshots(snapshots).map((snapshot) => <ShareSnapshotRow key={snapshot.id} snapshot={snapshot} />)
        )}
      </DataGrid>
    </Stack>
  )
}
