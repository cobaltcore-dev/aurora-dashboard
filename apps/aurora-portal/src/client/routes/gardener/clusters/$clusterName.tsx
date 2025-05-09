import { createFileRoute } from "@tanstack/react-router"
import ClusterDetail from "../-components/ClusterDetail"

export const Route = createFileRoute("/gardener/clusters/$clusterName")({
  component: RouteComponent,
  loader: async (options) => {
    const { context, params } = options
    const data = await context.trpcClient?.gardener.getClusterByName.query({ name: params.clusterName })

    return {
      trpcClient: context.trpcClient,
      cluster: data,
    }
  },
})

function RouteComponent() {
  const { cluster } = Route.useLoaderData()
  return (
    <div>
      <div className="w-full flex"></div>
      <div className="py-4 pl-4 bg-theme-global-bg h-full">{cluster && <ClusterDetail cluster={cluster} />}</div>
    </div>
  )
}
