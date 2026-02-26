import { ListToolbar } from "@/client/components/ListToolbar"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpListContainer } from "./-components/FloatingIpListContainer"

export const FloatingIps = () => {
  const { data: floatingIps = [], isLoading, isError, error } = trpcReact.network.floatingIp.list.useQuery({})

  return (
    <div className="relative">
      <ListToolbar />

      <FloatingIpListContainer floatingIps={floatingIps} isLoading={isLoading} isError={isError} error={error} />
    </div>
  )
}
