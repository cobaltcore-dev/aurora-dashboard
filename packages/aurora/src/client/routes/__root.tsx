import { createRootRouteWithContext, Outlet, useRouter, HeadContent } from "@tanstack/react-router"
import { AppShell, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { MainNavigation } from "../components/navigation/MainNavigation"
import { TrpcClient, TrpcReact } from "../trpcClient"
import { AuthContext } from "../store/AuthProvider"
import { NavigationItem } from "../components/navigation/types"
import type { Slots } from "../AuroraApp"
import styles from "../index.css?inline"
import { InactivityModal } from "../components/Auth/InactivityModal"
import { RouteError } from "../components/Error/RouteError"
import { useLingui } from "@lingui/react/macro"
import { StatusError } from "../components/Error/StatusError"

export interface RouterContext {
  trpcReact: TrpcReact
  trpcClient: TrpcClient
  auth: AuthContext
  navItems: NavigationItem[]
  handleThemeToggle?: (theme: string) => void
  slots?: Slots
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
      <HeadContent />
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
  const navigateTo = Route.useNavigate()
  const router = useRouter()

  return (
    <StatusError
      message={t`The page you are looking for does not exist.`}
      title={t`Page Not Found`}
      onHomeClick={() => navigateTo({ to: "/" })}
      onBackClick={() => router.history.back()}
      statusCode={404}
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
