import { useState, startTransition } from "react"
// import { Trans, useLingui } from "@lingui/react/macro"
import { ListToolbar } from "@/client/components/ListToolbar"
import { ContainerListView } from "./-components/ContainerListView"
import { mockAccountContainers } from "./-components/containersList.mock"

// interface Container {
//   count: number
//   bytes: number
//   name: string
//   last_modified: string
// }

export const ObjectStorage = () => {
  // const { t } = useLingui()
  const [searchTerm, setSearchTerm] = useState("")

  // Filter containers based on search term
  const filteredContainers = mockAccountContainers.filter((container) =>
    container.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => {
      setSearchTerm(searchValue)
    })
  }

  return (
    <div className="relative">
      <ListToolbar searchTerm={searchTerm} onSearch={handleSearchChange} />

      <ContainerListView containers={filteredContainers} />
    </div>
  )
}
