import { Suspense, use } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Stack, Icon } from "@cloudoperators/juno-ui-components"

const FlavorListContainer = ({ getFlavorPromise }: { getFlavorPromise: Promise<Flavor[] | undefined> }) => {
  const flavors = use(getFlavorPromise)

  if (!flavors || flavors.length === 0) {
    return (
      <DataGrid columns={7} minContentColumns={[0]} cellVerticalAlignment="top" className="flavors">
        <DataGridRow className="no-hover">
          <DataGridCell colSpan={7}>
            <Stack gap="3">
              <Icon data-testid="icon-info" icon="info" color="text-theme-info" />
              <div>
                <h3>No flavors found</h3>
                <p>No flavors are available for this project</p>
              </div>
            </Stack>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <DataGrid columns={7} minContentColumns={[0]} cellVerticalAlignment="top" className="flavors">
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
        <DataGridRow key={flavor.id}>
          <DataGridCell>{flavor.name || flavor.id}</DataGridCell>
          <DataGridCell>{flavor.vcpus || 0}</DataGridCell>
          <DataGridCell>{flavor.ram || 0}</DataGridCell>
          <DataGridCell>{flavor.disk || 0}</DataGridCell>
          <DataGridCell>{flavor["OS-FLV-EXT-DATA:ephemeral"] || 0}</DataGridCell>
          <DataGridCell>{flavor.swap || "N/A"}</DataGridCell>
          <DataGridCell>{flavor.rxtx_factor || 1.0}</DataGridCell>
        </DataGridRow>
      ))}
    </DataGrid>
  )
}

interface FlavorsProps {
  client: TrpcClient
  project: string
}

export const Flavors = ({ client, project }: FlavorsProps) => {
  const getFlavorsPromise = client.compute.getFlavorsByProjectId.query({ projectId: project })
  return (
    <Suspense fallback={<div>Loading flavors...</div>}>
      <FlavorListContainer getFlavorPromise={getFlavorsPromise} />
    </Suspense>
  )
}
