import { AppShellProvider, NotificationManager, AppShell } from "@cloudoperators/juno-ui-components"
import { RouterProvider } from "@tanstack/react-router"
import { AuthProvider, useAuth } from "./store/AuthProvider"
import { QueryClient, QueryClientProvider, hashKey } from "@tanstack/react-query"
import { trpcReact, trpcReactClient, trpcClient, setBffEndpoint } from "./trpcClient"
import { createAuroraRouter } from "./router"
import { useState, useEffect, useMemo } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useLingui } from "@lingui/react/macro"
import { ErrorBoundary } from "react-error-boundary"
import { Trans } from "@lingui/react/macro"
import { NavigationItem } from "./components/navigation/types"
import type { Slots, OnTrackEventCallback, ServiceExtension } from "./AuroraApp"
import { Status, Button } from "@cloudoperators/juno-ui-components"
import { AppConfigProvider, useAppConfig, useIsAppConfigLoading, useAppConfigStatus } from "./context/AppConfigContext"
import { gateSlots, resolveServiceVisibility } from "./utils/appConfigGating"
import { messages as enMessages } from "../locales/en/messages"
import styles from "./index.css?inline"
import { setupRouterAnalytics } from "./analytics/setupRouterAnalytics"

// Initialise i18n here so AuroraApp is self-contained and consumers don't need
// to set up Lingui before mounting the component.
i18n.load({ en: enMessages })
i18n.activate("en")

type AppProps = {
  theme?: "theme-dark" | "theme-light"
  bffEndpoint?: string
  onThemeChange?: (theme: "theme-dark" | "theme-light") => void
  slots?: Slots
  appName?: string
  onTrackEvent?: OnTrackEventCallback
  enabledServices?: string[]
  serviceExtensions?: ServiceExtension[]
}

// Additional navigation items can be added here and will be passed to the layout via context
// The items will appear in the main navigation bar and use internal routing (TanStack Router)
const navItems: NavigationItem[] = []

// Stable reference for the "no extensions" case so a missing prop doesn't allocate a fresh array
// on every render, which would defeat the buildNavSections useMemo in the project route.
const EMPTY_SERVICE_EXTENSIONS: ServiceExtension[] = []

/**
 * Shell used for the appConfig loading/error screens, which render before the router (and
 * thus before AuroraLayout) is mounted. Mirrors AuroraLayout's AppShell framing but omits the
 * header and footer, since the nav depends on config that is not yet resolved.
 */
function ConfigGateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{styles.toString()}</style>
      <AppShell pageHeader={""} fullWidthContent>
        {children}
      </AppShell>
    </>
  )
}

const App = (props: AppProps) => {
  useEffect(() => {
    setBffEndpoint(props.bffEndpoint ?? "/polaris-bff")
  }, [props.bffEndpoint])

  const [router] = useState(() => createAuroraRouter(trpcReact, trpcClient, props.serviceExtensions))

  const [currentTheme, setCurrentTheme] = useState<"theme-dark" | "theme-light">(props.theme ?? "theme-light")

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            // Prepend the active projectId to every query hash so that
            // switching projects never returns cached data from a previous project.
            queryKeyHashFn: (queryKey) => {
              const match = router.state.matches.findLast((m) => "projectId" in (m.params ?? {}))
              const projectId = (match?.params as { projectId?: string })?.projectId ?? ""
              return hashKey([projectId, ...queryKey])
            },
          },
        },
      })
  )
  const [reactClient] = useState(() => trpcReactClient)

  const handleThemeToggle = (newTheme: string) => {
    const theme = newTheme as "theme-dark" | "theme-light"
    setCurrentTheme(theme)
    props.onThemeChange?.(theme)
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => {
        const { message } = error as Error

        return (
          <div role="alert" style={{ padding: 24 }}>
            <p>
              <Trans>Something went wrong:</Trans>
            </p>
            {message && <pre style={{ color: "red" }}>{message}</pre>}
            <button onClick={resetErrorBoundary}>
              <Trans>Try Again</Trans>
            </button>
          </div>
        )
      }}
    >
      <I18nProvider i18n={i18n}>
        <AppShellProvider shadowRoot={false} theme={currentTheme}>
          <trpcReact.Provider client={reactClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AppConfigProvider>
                  <NotificationManager position="top-right" />
                  <AppInner
                    router={router}
                    navItems={navItems}
                    handleThemeToggle={handleThemeToggle}
                    slots={props.slots}
                    appName={props.appName}
                    onTrackEvent={props.onTrackEvent}
                    enabledServices={props.enabledServices}
                    serviceExtensions={props.serviceExtensions ?? EMPTY_SERVICE_EXTENSIONS}
                  />
                </AppConfigProvider>
              </AuthProvider>
            </QueryClientProvider>
          </trpcReact.Provider>
        </AppShellProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}

type AuroraRouter = ReturnType<typeof createAuroraRouter>

function AppInner({
  router,
  navItems,
  handleThemeToggle,
  slots,
  appName,
  onTrackEvent,
  enabledServices,
  serviceExtensions,
}: {
  router: AuroraRouter
  navItems: NavigationItem[]
  handleThemeToggle: (theme: string) => void
  slots?: Slots
  appName?: string
  onTrackEvent?: OnTrackEventCallback
  enabledServices?: string[]
  serviceExtensions: ServiceExtension[]
}) {
  const auth = useAuth()
  const { t } = useLingui()
  const isConfigLoading = useIsAppConfigLoading()
  const { error: configError, retry } = useAppConfigStatus()
  const appConfig = useAppConfig()

  // Apply the resolved domain config on top of the consumer-provided props before handing
  // them to the router context, so every downstream slot/service check honours it.
  const effectiveSlots = useMemo(() => gateSlots(slots, appConfig?.slots), [slots, appConfig])
  const { enabledServices: effectiveEnabledServices, deniedServices: effectiveDeniedServices } = useMemo(
    () => resolveServiceVisibility(enabledServices, appConfig?.services),
    [enabledServices, appConfig]
  )

  // Set up analytics tracking for router navigation.
  // isConfigLoading is in deps so the subscription is deferred until the RouterProvider is live.
  useEffect(() => {
    if (onTrackEvent && !isConfigLoading) {
      return setupRouterAnalytics(router)
    }
  }, [router, onTrackEvent, isConfigLoading])

  if (isConfigLoading)
    return (
      <ConfigGateLayout>
        <Status status="progress" title={t`Loading…`} />
      </ConfigGateLayout>
    )

  if (configError) {
    return (
      <ConfigGateLayout>
        <Status
          status="error"
          title={t`Configuration Unavailable`}
          body={t`The application configuration could not be loaded. Some services and features may be unavailable.`}
          action={
            <Button variant="primary" onClick={retry}>
              {t`Try Again`}
            </Button>
          }
        />
      </ConfigGateLayout>
    )
  }

  const routerContext = {
    trpcReact,
    trpcClient,
    auth,
    navItems,
    handleThemeToggle,
    slots: effectiveSlots,
    appName,
    onTrackEvent,
    enabledServices: effectiveEnabledServices,
    deniedServices: effectiveDeniedServices,
    serviceExtensions,
  }

  return <RouterProvider router={router} context={routerContext} />
}

export default App
