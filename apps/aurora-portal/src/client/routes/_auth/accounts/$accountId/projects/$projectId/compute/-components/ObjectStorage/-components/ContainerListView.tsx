import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { ContainerTableRow } from "./ContainerTableRow"

interface Container {
  count: number
  bytes: number
  name: string
  last_modified: string
}

interface ContainerListViewProps {
  containers: Container[]
}

export const ContainerListView = ({ containers }: ContainerListViewProps) => {
  if (!containers || containers.length === 0) {
    return (
      <DataGrid columns={4} className="containers" data-testid="no-containers">
        <DataGridRow>
          <DataGridCell colSpan={4}>
            <ContentHeading>
              <Trans>No containers found</Trans>
            </ContentHeading>
            <p>
              <Trans>
                There are no containers available with the current search criteria. Try adjusting your search term.
              </Trans>
            </p>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <DataGrid columns={4} className="containers" data-testid="containers-table">
      <DataGridRow>
        <DataGridHeadCell>
          <Trans>Container Name</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Object Count</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Last Modified</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Total Size</Trans>
        </DataGridHeadCell>
      </DataGridRow>

      {containers.map((container) => (
        <ContainerTableRow key={container.name} container={container} />
      ))}
    </DataGrid>
  )
}
