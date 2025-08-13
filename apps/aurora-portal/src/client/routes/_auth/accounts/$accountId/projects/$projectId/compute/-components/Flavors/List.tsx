import { useState, useEffect } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  Message,
} from "@cloudoperators/juno-ui-components"
import FilterToolbar from "./-components/FilterToolbar"

const FlavorListContainer = ({ flavors, isLoading }: { flavors?: Flavor[]; error?: Error; isLoading: boolean }) => {
  if (isLoading) {
    return <div>Loading flavors...</div>
  }

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

interface FlavorsProps {
  client: TrpcClient
  project: string
}

export const Flavors = ({ client, project }: FlavorsProps) => {
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState("asc")
  const [searchTerm, setSearchTerm] = useState("")
  const [flavors, setFlavors] = useState<Flavor[] | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFlavors = async () => {
      try {
        setIsLoading(true)
        setError(undefined)
        const data = await client.compute.getFlavorsByProjectId.query({
          projectId: project,
          sortBy,
          sortDirection,
          searchTerm,
        })
        setFlavors(data)
      } catch (err) {
        console.error(err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFlavors()
  }, [client, project, sortBy, sortDirection, searchTerm])

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

  if (error) {
    return <Message text={error.message} variant="error" />
  }

  return (
    <>
      <FilterToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        handleSortByChange={handleSortByChange}
        sortDirection={sortDirection}
        handleSortDirectionChange={handleSortDirectionChange}
      />
      <FlavorListContainer flavors={flavors} isLoading={isLoading} />
    </>
  )
}
