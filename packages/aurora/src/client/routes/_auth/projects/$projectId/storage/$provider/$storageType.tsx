import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/$provider/$storageType")({
  staticData: {
    section: "storage",
    service: "containers",
  } satisfies RouteInfo,
  component: StorageTypeLayout,
})

function StorageTypeLayout() {
  const { t } = useLingui()
  const { provider } = Route.useParams()
  const label =
    provider === "swift" ? t`Object Storage (Swift)` : provider === "ceph" ? t`Object Storage (Ceph)` : t`Storage`
  useSetBreadcrumb(Route.id, label)
  return <Outlet />
}
