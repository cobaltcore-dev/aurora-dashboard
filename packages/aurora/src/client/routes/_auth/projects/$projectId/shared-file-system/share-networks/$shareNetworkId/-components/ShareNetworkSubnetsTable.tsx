import { Trans, useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import ClipboardText from "@/client/components/ClipboardText"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import { SharedFileSystemIdLink } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/SharedFileSystemIdLink"
import type { ShareNetworkSubnet } from "@/server/SharedFileSystem/types/shareNetwork"

const COLUMN_COUNT = 10

interface ShareNetworkSubnetsTableProps {
  subnets: ShareNetworkSubnet[]
  projectId: string
  networksAvailable: boolean
}

export const ShareNetworkSubnetsTable = ({ subnets, projectId, networksAvailable }: ShareNetworkSubnetsTableProps) => {
  const { t } = useLingui()

  return (
    <Stack direction="vertical" className="juno-pattern-datagrid-outer">
      <DataGrid columns={COLUMN_COUNT} cellVerticalAlignment="top" data-testid="share-network-subnets-table">
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Subnet ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Availability Zone</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>CIDR</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>IP Version</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Gateway</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Network Type</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>MTU</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Segmentation ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Neutron Network</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Neutron Subnet</Trans>
          </DataGridHeadCell>
        </DataGridRow>

        {subnets.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="empty" title={t`No Subnets`} body={t`This share network has no subnets.`} />
            </DataGridCell>
          </DataGridRow>
        ) : (
          subnets.map((subnet, index) => (
            <DataGridRow key={subnet.id ?? `subnet-${index}`}>
              <DataGridCell>
                {subnet.id ? <ClipboardText text={subnet.id} truncateAt={13} /> : EMPTY_VALUE}
              </DataGridCell>
              <DataGridCell>{subnet.availability_zone || EMPTY_VALUE}</DataGridCell>
              <DataGridCell>
                {subnet.cidr ? <span className="break-all">{subnet.cidr}</span> : EMPTY_VALUE}
              </DataGridCell>
              <DataGridCell>{subnet.ip_version ?? EMPTY_VALUE}</DataGridCell>
              <DataGridCell>
                {subnet.gateway ? <span className="break-all">{subnet.gateway}</span> : EMPTY_VALUE}
              </DataGridCell>
              <DataGridCell>{subnet.network_type || EMPTY_VALUE}</DataGridCell>
              <DataGridCell>{subnet.mtu ?? EMPTY_VALUE}</DataGridCell>
              <DataGridCell>{subnet.segmentation_id ?? EMPTY_VALUE}</DataGridCell>
              <DataGridCell>
                {subnet.neutron_net_id ? (
                  <SharedFileSystemIdLink
                    target="network"
                    id={subnet.neutron_net_id}
                    projectId={projectId}
                    linkable={networksAvailable}
                  />
                ) : (
                  EMPTY_VALUE
                )}
              </DataGridCell>
              <DataGridCell>
                {subnet.neutron_subnet_id ? (
                  <ClipboardText text={subnet.neutron_subnet_id} truncateAt={13} />
                ) : (
                  EMPTY_VALUE
                )}
              </DataGridCell>
            </DataGridRow>
          ))
        )}
      </DataGrid>
    </Stack>
  )
}
