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
  return <div className="h-full ">{cluster && <ClusterDetail cluster={cluster} />}</div>
}
