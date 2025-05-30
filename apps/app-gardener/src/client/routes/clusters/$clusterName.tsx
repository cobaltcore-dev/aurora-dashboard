import { createFileRoute } from "@tanstack/react-router"
import ClusterDetail from "../-components/ClusterDetail"

export const Route = createFileRoute("/clusters/$clusterName")({
  component: RouteComponent,
  loader: async (options) => {
    const { context, params } = options
    const data = await context.trpcClient?.getClusterByName.query({ name: params.clusterName })

    return {
      trpcClient: context.trpcClient,
      cluster: data,
    }
  },
})

function RouteComponent() {
  const { cluster } = Route.useLoaderData()
  return <div className="bg-theme-global-bg h-full">{cluster && <ClusterDetail cluster={cluster} />}</div>
}
