import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router"
import { TabNavigation, TabNavigationItem } from "@cloudoperators/juno-ui-components"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { t } from "@lingui/core/macro"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager")({
  staticData: {
    section: "authorization",
    service: "key-manager",
  } satisfies RouteInfo,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices ?? [])
    if (!serviceIndex["key-manager"]?.["barbican"]) {
      throw redirect({ to: "/projects/$projectId", params: { projectId } })
    }
  },
  component: KeyManagerLayout,
})

function KeyManagerLayout() {
  const { projectId } = Route.useParams() as { projectId: string }
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const parts = pathname.split("/")
  const activeTab = parts.includes("containers") ? "containers" : parts.includes("orders") ? "orders" : "secrets"

  return (
    <div>
      <ContentHeader title={t`Key Manager`} projectId={projectId} />
      <TabNavigation
        activeItem={activeTab}
        onActiveItemChange={(value: unknown) => {
          const tab = String(value)
          void navigate({
            to: `/projects/${projectId}/authorization/key-manager/${tab}` as never,
          })
        }}
      >
        <TabNavigationItem label={t`Secrets`} value="secrets" />
        <TabNavigationItem label={t`Containers`} value="containers" />
        <TabNavigationItem label={t`Orders`} value="orders" />
      </TabNavigation>
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  )
}
