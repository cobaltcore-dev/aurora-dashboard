import { startTransition, useState } from "react"
import { ListToolbar } from "@/client/components/ListToolbar"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpListContainer } from "./-components/FloatingIpListContainer"

export const FloatingIps = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => setSearchTerm(searchValue))
  }

  const {
    data: floatingIps = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.floatingIp.list.useQuery({
    ...(searchTerm ? { searchTerm } : {}),
  })

  return (
    <div className="relative">
      <ListToolbar searchTerm={searchTerm} onSearch={handleSearchChange} />

      <FloatingIpListContainer floatingIps={floatingIps} isLoading={isLoading} isError={isError} error={error} />
    </div>
  )
}
