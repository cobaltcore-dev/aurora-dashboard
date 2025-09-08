import { createFileRoute } from "@tanstack/react-router"
import ClusterDetail from "../-components/ClusterDetail"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/gardener/clusters/$clusterName")({
  component: RouteComponent,
  loader: async (options) => {
    const { context, params } = options
    const data = await context.trpcClient?.gardener.getClusterByName.query({ name: params.clusterName })
    const permissions = await context.trpcClient?.gardener.getPermissions.query({ projectId: params.projectId })

    return {
      trpcClient: context.trpcClient,
      permissions,
      cluster: data,
    }
  },
})

function RouteComponent() {
  const { cluster, permissions } = Route.useLoaderData()
  return (
    <div className="h-full ">
      {cluster && <ClusterDetail cluster={cluster} isDeleteAllowed={!!permissions?.delete} />}
    </div>
  )
}
