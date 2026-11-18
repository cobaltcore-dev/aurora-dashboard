import { Trans, useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { Network } from "@/server/Network/types/network"

interface NetworkSegmentationTabProps {
  network: Network
}

export function NetworkSegmentationTab({ network }: NetworkSegmentationTabProps) {
  const { t } = useLingui()

  const networkType = network["provider:network_type"]
  const physicalNetwork = network["provider:physical_network"]
  const segmentationId = network["provider:segmentation_id"]

  const hasData = networkType != null || physicalNetwork != null || segmentationId != null

  if (!hasData) {
    return (
      <Status
        status="empty"
        title={t`No Segmentation Data`}
        body={t`No segmentation data available.`}
        data-testid="segmentation-empty"
      />
    )
  }

  const segmentCount = 1

  return (
    <Stack direction="vertical" gap="2">
      <span className="text-theme-light text-sm" data-testid="segment-count">
        <Trans>{segmentCount} segment</Trans>
        {networkType && ` · ${networkType}: 1`}
      </span>
      <DataGrid columns={3} data-testid="segmentation-table">
        <DataGridRow>
          <DataGridHeadCell>{t`Network Type`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Physical Network`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Segmentation ID`}</DataGridHeadCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridCell>{networkType ?? "- -"}</DataGridCell>
          <DataGridCell>{physicalNetwork ?? "- -"}</DataGridCell>
          <DataGridCell>{segmentationId != null ? String(segmentationId) : "- -"}</DataGridCell>
        </DataGridRow>
      </DataGrid>
    </Stack>
  )
}
