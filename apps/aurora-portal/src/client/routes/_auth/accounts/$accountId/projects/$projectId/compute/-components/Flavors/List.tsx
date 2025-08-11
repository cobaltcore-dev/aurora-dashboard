import { useState } from "react"
import { Suspense, use } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"
import FilterToolbar from "./-components/FilterToolbar"

const FlavorListContainer = ({ getFlavorPromise }: { getFlavorPromise: Promise<Flavor[] | undefined> }) => {
  const flavors = use(getFlavorPromise)

  if (!flavors || flavors.length === 0) {
    return (
      <DataGrid columns={7} className="flavors">
        <DataGridRow>
          <DataGridCell colSpan={7}>
            <ContentHeading>No flavors found</ContentHeading>
            <p>
              There are no flavors available for this project with the current filters applied. Try adjusting your
              filter criteria or create a new flavor.
            </p>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <DataGrid columns={7} className="flavors">
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
          <DataGridCell>{flavor.vcpus || "‐"}</DataGridCell>
          <DataGridCell>{flavor.ram || "‐"}</DataGridCell>
          <DataGridCell>{flavor.disk || "‐"}</DataGridCell>
          <DataGridCell>{flavor["OS-FLV-EXT-DATA:ephemeral"] || "‐"}</DataGridCell>
          <DataGridCell>{flavor.swap || "‐"}</DataGridCell>
          <DataGridCell>{flavor.rxtx_factor || "‐"}</DataGridCell>
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
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState("asc")
  const [searchTerm, setSearchTerm] = useState("")

  const getFlavorsPromise = client.compute.getFlavorsByProjectId.query({
    projectId: project,
    sortBy,
    sortDirection,
    searchTerm,
  })

  const handleSortByChange = (value: string | number | string[] | undefined) => {
    if (value && typeof value === "string") {
      setSortBy(value)
    }
  }

  const handleSortDirectionChange = (value: string | number | string[] | undefined) => {
    if (value && typeof value === "string") {
      setSortDirection(value)
    }
  }

  return (
    <>
      <Suspense fallback={<div>Loading flavors...</div>}>
        <FilterToolbar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          handleSortByChange={handleSortByChange}
          sortDirection={sortDirection}
          handleSortDirectionChange={handleSortDirectionChange}
        />
        <FlavorListContainer getFlavorPromise={getFlavorsPromise} />
      </Suspense>
    </>
  )
}
