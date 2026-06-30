import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/swift/")({
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    if (!serviceIndex["object-store"]?.["swift"]) {
      // Fallback to Ceph if available, otherwise project overview
      // TEMPORARY: Allow Ceph access even if not in catalog (relies on env config)
      const hasCeph = Boolean(serviceIndex["object-store"]?.["ceph"]) || true // cephFallbackEnabled
      throw redirect({
        to: hasCeph ? "/projects/$projectId/storage/ceph/buckets" : "/projects/$projectId",
        params: { projectId },
      })
    }
  },
  component: () => <Outlet />,
})
