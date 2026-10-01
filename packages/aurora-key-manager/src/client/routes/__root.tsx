import { createRootRouteWithContext, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { TabNavigation, TabNavigationItem } from "@cloudoperators/juno-ui-components"

export type KmRouterContext = { projectId: string }

function KmLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const parts = pathname.split("/")
  const activeTab = parts.includes("containers") ? "containers" : parts.includes("orders") ? "orders" : "secrets"

  return (
    <div>
      <TabNavigation
        activeItem={activeTab}
        onActiveItemChange={(value: unknown) => {
          navigate({ to: `/${String(value)}` })
        }}
      >
        <TabNavigationItem label="Secrets" value="secrets" />
        <TabNavigationItem label="Containers" value="containers" />
        <TabNavigationItem label="Orders" value="orders" />
      </TabNavigation>
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  )
}

export const rootRoute = createRootRouteWithContext<KmRouterContext>()({
  component: KmLayout,
})
