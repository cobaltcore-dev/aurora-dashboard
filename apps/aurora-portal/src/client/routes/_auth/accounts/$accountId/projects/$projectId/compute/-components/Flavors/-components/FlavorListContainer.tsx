import { Flavor } from "@/server/Compute/types/flavor"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

interface FlavorListContainerProps {
  flavors?: Flavor[]
  isLoading: boolean
}

export const FlavorListContainer = ({ flavors, isLoading }: FlavorListContainerProps) => {
  if (isLoading) {
    return (
      <div data-testid="loading">
        <Trans>Loading...</Trans>
      </div>
    )
  }

  if (!flavors || flavors.length === 0) {
    return (
      <DataGrid columns={7} className="flavors" data-testid="no-flavors">
        <DataGridRow>
          <DataGridCell colSpan={7}>
            <ContentHeading>
              <Trans>No flavors found</Trans>
            </ContentHeading>
            <p>
              <Trans>
                There are no flavors available for this project with the current filters applied. Try adjusting your
                filter criteria or create a new flavor.
              </Trans>
            </p>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <DataGrid columns={7} className="flavors" data-testid="flavors-table">
      <DataGridRow>
        <DataGridHeadCell>Name</DataGridHeadCell>
        <DataGridHeadCell>vCPU</DataGridHeadCell>
        <DataGridHeadCell>RAM (MiB)</DataGridHeadCell>
        <DataGridHeadCell>Root Disk (GiB)</DataGridHeadCell>
        <DataGridHeadCell>Ephemeral Disk (GiB)</DataGridHeadCell>
        <DataGridHeadCell>Swap (MiB)</DataGridHeadCell>
        <DataGridHeadCell>RX/TX Factor</DataGridHeadCell>
      </DataGridRow>

      {flavors.map((flavor) => (
        <DataGridRow key={flavor.id} data-testid={`flavor-row-${flavor.id}`}>
          <DataGridCell>{flavor.name || flavor.id}</DataGridCell>
          <DataGridCell>{flavor.vcpus || "–"}</DataGridCell>
          <DataGridCell>{flavor.ram || "–"}</DataGridCell>
          <DataGridCell>{flavor.disk || "–"}</DataGridCell>
          <DataGridCell>{flavor["OS-FLV-EXT-DATA:ephemeral"] || "–"}</DataGridCell>
          <DataGridCell>{flavor.swap || "–"}</DataGridCell>
          <DataGridCell>{flavor.rxtx_factor || "–"}</DataGridCell>
        </DataGridRow>
      ))}
    </DataGrid>
  )
}
