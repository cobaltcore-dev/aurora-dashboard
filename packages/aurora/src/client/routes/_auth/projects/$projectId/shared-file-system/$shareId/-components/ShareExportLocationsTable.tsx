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
import ClipboardText from "@/client/components/ClipboardText"
import type { ShareExportLocation } from "@/server/SharedFileSystem/types/share"
import { sortExportLocations } from "./shareDetailUtils"

const COLUMN_COUNT = 2
const EMPTY_VALUE = "- -"

interface ShareExportLocationsTableProps {
  exportLocations: ShareExportLocation[]
  isLoading: boolean
  error: { message?: string; data?: { code?: string } | null } | null
  canList: boolean
  onRetry: () => void
}

export const ShareExportLocationsTable = ({
  exportLocations,
  isLoading,
  error,
  canList,
  onRetry,
}: ShareExportLocationsTableProps) => {
  const { t } = useLingui()

  return (
    <Stack direction="vertical" className="juno-pattern-datagrid-outer">
      <DataGrid columns={COLUMN_COUNT} cellVerticalAlignment="top" data-testid="share-export-locations-table">
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Path</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Preferred</Trans>
          </DataGridHeadCell>
        </DataGridRow>

        {/* DT-7: State rows */}
        {!canList || error?.data?.code === "FORBIDDEN" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Access Denied`}
                body={t`You don't have permission to view the export locations of this share.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : isLoading ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="progress" title={t`Loading Export Locations...`} />
            </DataGridCell>
          </DataGridRow>
        ) : error?.data?.code === "UNAUTHORIZED" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Session Expired`}
                body={t`Your session has expired. Sign in again to view export locations.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : error ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Failed to Load Export Locations`}
                body={t`The export locations could not be loaded.`}
                action={<Button size="xs" label={t`Try Again`} onClick={onRetry} />}
              />
            </DataGridCell>
          </DataGridRow>
        ) : exportLocations.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="empty" title={t`No Export Locations`} body={t`This share has no export locations.`} />
            </DataGridCell>
          </DataGridRow>
        ) : (
          sortExportLocations(exportLocations).map((location) => (
            <DataGridRow key={location.id}>
              <DataGridCell>
                {location.path ? <ClipboardText text={location.path} className="break-all" /> : EMPTY_VALUE}
              </DataGridCell>
              <DataGridCell>
                {location.preferred === true ? t`Yes` : location.preferred === false ? t`No` : EMPTY_VALUE}
              </DataGridCell>
            </DataGridRow>
          ))
        )}
      </DataGrid>
    </Stack>
  )
}
