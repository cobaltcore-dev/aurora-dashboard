import { useState } from "react"
import { Suspense, use } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Select,
  SelectOption,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"

const FlavorListContainer = ({ getFlavorPromise }: { getFlavorPromise: Promise<Flavor[] | undefined> }) => {
  const flavors = use(getFlavorPromise)

  if (!flavors || flavors.length === 0) {
    return (
      <DataGrid columns={7} className="flavors">
        <DataGridRow>
          <DataGridCell colSpan={7}>
            <ContentHeading>No flavors found</ContentHeading>
            <p>No flavors are available for this project</p>
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

  const getFlavorsPromise = client.compute.getFlavorsByProjectId.query({
    projectId: project,
    sortBy,
    sortDirection,
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
      <div>
        <Select onChange={handleSortByChange} value={sortBy}>
          <SelectOption value="name">Name</SelectOption>
          <SelectOption value="vcpus">VCPUs</SelectOption>
          <SelectOption value="ram">RAM</SelectOption>
          <SelectOption value="disk">Root Disk</SelectOption>
          <SelectOption value="OS-FLV-EXT-DATA:ephemeral">Ephemeral Disk</SelectOption>
          <SelectOption value="swap">Swap</SelectOption>
          <SelectOption value="rxtx_factor">RX/TX Factor</SelectOption>
        </Select>
        <Select onChange={handleSortDirectionChange} value={sortDirection}>
          <SelectOption value="asc">Ascending</SelectOption>
          <SelectOption value="desc">Descending</SelectOption>
        </Select>
      </div>
      <Suspense fallback={<div>Loading flavors...</div>}>
        <FlavorListContainer getFlavorPromise={getFlavorsPromise} />
      </Suspense>
    </>
  )
}
