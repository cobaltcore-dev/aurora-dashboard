import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { AppShell } from "@cloudoperators/juno-ui-components"
import { MainNavigation } from "../components/navigation/MainNavigation"
import { TrpcClient, TrpcReact } from "../trpcClient"
import { AuthContext } from "../store/AuthProvider"
import { ErrorBoundary } from "../components/Error/ErrorBoundry"
import { NotFound } from "../components/Error/NotFound"
import { NavigationItem } from "../components/navigation/types"
import styles from "../index.css?inline"
import { InactivityModal } from "../components/Auth/InactivityModal"

interface RouterContext {
  trpcReact: TrpcReact
  trpcClient: TrpcClient
  auth: AuthContext
  navItems: NavigationItem[]
  handleThemeToggle?: (theme: string) => void
  pageTitleRef: React.MutableRefObject<string>
  setPageTitle: (title: string) => void
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: AuroraLayout,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
})

function AuroraLayout() {
  const { navItems, handleThemeToggle } = Route.useRouteContext()

  return (
    <>
      <style>{styles.toString()}</style>

      <AppShell pageHeader={<MainNavigation items={navItems} handleThemeToggle={handleThemeToggle} />} fullWidthContent>
        <InactivityModal />
        <Outlet />
      </AppShell>
    </>
  )
}
