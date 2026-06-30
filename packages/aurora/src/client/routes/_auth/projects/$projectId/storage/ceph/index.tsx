import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/ceph/")({
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    const hasCeph = Boolean(serviceIndex["object-store"]?.["ceph"])
    // TEMPORARY: Allow Ceph access even if not in catalog (relies on env config)
    // TODO: Properly register Ceph in OpenStack service catalog
    const cephFallbackEnabled = true
    const hasEffectiveCeph = hasCeph || cephFallbackEnabled

    if (!hasEffectiveCeph) {
      // Fallback to Swift if available, otherwise project overview
      const hasSwift = Boolean(serviceIndex["object-store"]?.["swift"])
      throw redirect({
        to: hasSwift ? "/projects/$projectId/storage/swift/containers" : "/projects/$projectId",
        params: { projectId },
      })
    }
  },
  component: () => <Outlet />,
})
