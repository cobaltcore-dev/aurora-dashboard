import { createFileRoute, Outlet, redirect, useNavigate, useMatch } from "@tanstack/react-router"
import { TabNavigation, TabNavigationItem, Button } from "@cloudoperators/juno-ui-components"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import type { RouteInfo } from "@/client/routes/routeInfo"

const KeyManagerErrorComponent = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  return (
    <RouteIdLevelDefaultError
      action={
        <Button
          variant="primary"
          onClick={() =>
            navigate({
              to: "/projects/$projectId/authorization/key-manager/secrets/",
              params: { projectId },
            })
          }
        >
          {t`Back to Key Manager`}
        </Button>
      }
    />
  )
}

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Key Manager` },
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
  errorComponent: KeyManagerErrorComponent,
})

function KeyManagerLayout() {
  const { t } = useLingui()
  const { projectId } = Route.useParams() as { projectId: string }
  const navigate = useNavigate()

  const containersIndexMatch = useMatch({
    from: "/_auth/projects/$projectId/authorization/key-manager/containers/",
    shouldThrow: false,
  })
  const containersDetailMatch = useMatch({
    from: "/_auth/projects/$projectId/authorization/key-manager/containers/$containerId",
    shouldThrow: false,
  })
  const ordersIndexMatch = useMatch({
    from: "/_auth/projects/$projectId/authorization/key-manager/orders/",
    shouldThrow: false,
  })
  const ordersDetailMatch = useMatch({
    from: "/_auth/projects/$projectId/authorization/key-manager/orders/$orderId",
    shouldThrow: false,
  })
  const isContainersRoute = Boolean(containersIndexMatch ?? containersDetailMatch)
  const isOrdersRoute = Boolean(ordersIndexMatch ?? ordersDetailMatch)
  const activeTab = isContainersRoute ? "containers" : isOrdersRoute ? "orders" : "secrets"

  const tabPaths = {
    secrets: "/projects/$projectId/authorization/key-manager/secrets/",
    containers: "/projects/$projectId/authorization/key-manager/containers/",
    orders: "/projects/$projectId/authorization/key-manager/orders/",
  } as const

  return (
    <div>
      <TabNavigation
        activeItem={activeTab}
        onActiveItemChange={(value: unknown) => {
          const tab = String(value) as "secrets" | "containers" | "orders"
          void navigate({ to: tabPaths[tab], params: { projectId } })
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
