import { useState, useEffect } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import { Message } from "@cloudoperators/juno-ui-components"
import FilterToolbar from "./-components/FilterToolbar"
import { FlavorListContainer } from "./-components/FlavorListContainer"

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
