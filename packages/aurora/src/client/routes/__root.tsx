import { createRootRouteWithContext, Outlet, HeadContent } from "@tanstack/react-router"
import { AppShell, Button, Container, Status } from "@cloudoperators/juno-ui-components"
import { MainNavigation } from "../components/navigation/MainNavigation"
import { TrpcClient, TrpcReact } from "../trpcClient"
import { AuthContext } from "../store/AuthProvider"
import { NavigationItem } from "../components/navigation/types"
import type { Slots, OnTrackEventCallback, ServiceExtension } from "../AuroraApp"
import styles from "../index.css?inline"
import { RouteError } from "../components/Error/RouteError"
import { TRPCClientError } from "@trpc/client"
import { useLingui, Trans } from "@lingui/react/macro"
import { Slot } from "../components/Slot"

export interface RouterContext {
  trpcReact: TrpcReact
  trpcClient: TrpcClient
  auth: AuthContext
  navItems: NavigationItem[]
  handleThemeToggle?: (theme: string) => void
  slots?: Slots
  appName?: string
  onTrackEvent?: OnTrackEventCallback
  enabledServices?: string[]
  serviceExtensions: ServiceExtension[]
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: PageNotFound,
  errorComponent: RootErrorComponent,
  pendingComponent: PendingComponent,
})

function AuroraLayout({ children }: { children: React.ReactNode }) {
  const { navItems, handleThemeToggle, appName, slots } = Route.useRouteContext()

  return (
    <>
      <HeadContent />
      <style>{styles.toString()}</style>

      <AppShell
        pageHeader={
          <MainNavigation items={navItems} handleThemeToggle={handleThemeToggle} appName={appName} slots={slots} />
        }
        pageFooter={
          // Wrapped in an app-owned element so the table-height measurement can
          // anchor its bottom edge to the footer without depending on the
          // shell's internal markup. See useAvailableViewportHeight.
          slots?.pageFooter ? (
            <div className="app-page-footer">
              <Slot component={slots.pageFooter} useShadowDOM={false} />
            </div>
          ) : undefined
        }
        fullWidthContent
      >
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
      <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
    </AuroraLayout>
  )
}

function PageNotFound() {
  const { t } = useLingui()
  const navigateTo = Route.useNavigate()

  return (
    <Container className="py-8">
      <Status
        status="error"
        code={404}
        title={t`Page Not Found`}
        body={t`The page you are looking for does not exist.`}
        action={
          <Button variant="primary" onClick={() => navigateTo({ to: "/" })}>
            <Trans>Go to Home</Trans>
          </Button>
        }
      />
    </Container>
  )
}

function PendingComponent() {
  const { t } = useLingui()
  return (
    <AuroraLayout>
      <Status status="progress" title={t`Loading...`} />
    </AuroraLayout>
  )
}
