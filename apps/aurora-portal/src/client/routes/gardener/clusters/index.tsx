import { createFileRoute } from "@tanstack/react-router"
import ClusterTable from "../-components/ClusterTable"

export const Route = createFileRoute("/gardener/clusters/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const clusters = await context.trpcClient?.gardener.getClusters.query()

    return {
      clusters: clusters,
    }
  },
})

function RouteComponent() {
  const { clusters } = Route.useLoaderData()
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-white">Clusters</h2>
      </div>
      <ClusterTable propClusters={clusters} />
    </div>
  )
}
