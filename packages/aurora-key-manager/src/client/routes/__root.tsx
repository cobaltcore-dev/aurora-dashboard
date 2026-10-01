import {
  createRootRouteWithContext,
  Outlet,
  useNavigate,
  useRouterState,
  useRouteContext,
} from "@tanstack/react-router"
import { ContentHeading, Divider, TabNavigation, TabNavigationItem } from "@cloudoperators/juno-ui-components"
import { CopyText } from "../components/CopyText"

export type KmRouterContext = { projectId: string }

function KmLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { projectId } = useRouteContext({ strict: false }) as KmRouterContext

  const parts = pathname.split("/")
  const activeTab = parts.includes("containers") ? "containers" : parts.includes("orders") ? "orders" : "secrets"

  return (
    <div>
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <ContentHeading>Key Manager</ContentHeading>
          <div className="text-theme-light flex shrink-0 items-center gap-1 text-sm">
            <span className="font-semibold">Project ID: </span>
            <CopyText text={projectId} />
          </div>
        </div>
        <Divider className="mt-4" />
      </header>
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
