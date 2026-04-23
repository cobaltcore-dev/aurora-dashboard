import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { AppShell, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { MainNavigation } from "../components/navigation/MainNavigation"
import { TrpcClient, TrpcReact } from "../trpcClient"
import { AuthContext } from "../store/AuthProvider"
import { NavigationItem } from "../components/navigation/types"
import styles from "../index.css?inline"
import { InactivityModal } from "../components/Auth/InactivityModal"
import { RouteError } from "../components/Error/RouteError"
import { useLingui } from "@lingui/react/macro"

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
  component: RootComponent,
  notFoundComponent: PageNotFound,
  errorComponent: RootErrorComponent,
  pendingComponent: PendingComponent,
})

function AuroraLayout({ children }: { children: React.ReactNode }) {
  const { navItems, handleThemeToggle } = Route.useRouteContext()

  return (
    <>
      <style>{styles.toString()}</style>

      <AppShell pageHeader={<MainNavigation items={navItems} handleThemeToggle={handleThemeToggle} />} fullWidthContent>
        <InactivityModal />
        {children}
      </AppShell>
    </>
  )
}

function RootComponent() {
  return (
    <AuroraLayout>
      <Outlet />
    </AuroraLayout>
  )
}

function RootErrorComponent({ error }: { error: Error }) {
  return (
    <AuroraLayout>
      <RouteError error={error} />
    </AuroraLayout>
  )
}

function PageNotFound() {
  const { t } = useLingui()

  return (
    <RouteError
      error={t`The page you are looking for does not exist.`}
      statusCode={404}
      helpText={t`The page you are looking for does not exist.`}
      title={t`Page Not Found`}
    />
  )
}

function PendingComponent() {
  return (
    <AuroraLayout>
      <Stack className="fixed inset-0" distribution="center" alignment="center">
        <div className="absolute inset-0 backdrop-blur-sm" />
        <Spinner variant="primary" size="large" />
      </Stack>
    </AuroraLayout>
  )
}
