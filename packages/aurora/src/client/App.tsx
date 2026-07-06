import { AppShellProvider, NotificationManager } from "@cloudoperators/juno-ui-components"
import { RouterProvider } from "@tanstack/react-router"
import { AuthProvider, useAuth } from "./store/AuthProvider"
import { QueryClient, QueryClientProvider, hashKey } from "@tanstack/react-query"
import { trpcReact, trpcReactClient, trpcClient, setBffEndpoint } from "./trpcClient"
import { createAuroraRouter } from "./router"
import { useState, useEffect } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ErrorBoundary } from "react-error-boundary"
import { Trans } from "@lingui/react/macro"
import { NavigationItem } from "./components/navigation/types"
import type { Slots, OnTrackEventCallback } from "./AuroraApp"
import { messages as enMessages } from "../locales/en/messages"
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
}

// Additional navigation items can be added here and will be passed to the layout via context
// The items will appear in the main navigation bar and use internal routing (TanStack Router)
const navItems: NavigationItem[] = []

const App = (props: AppProps) => {
  useEffect(() => {
    setBffEndpoint(props.bffEndpoint ?? "/polaris-bff")
  }, [props.bffEndpoint])

  const [router] = useState(() => createAuroraRouter(trpcReact, trpcClient))

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
              <Trans>Try again</Trans>
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
                <NotificationManager position="top-right" />
                <AppInner
                  router={router}
                  navItems={navItems}
                  handleThemeToggle={handleThemeToggle}
                  slots={props.slots}
                  appName={props.appName}
                  onTrackEvent={props.onTrackEvent}
                  enabledServices={props.enabledServices}
                />
              </AuthProvider>
            </QueryClientProvider>
          </trpcReact.Provider>
        </AppShellProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}

function AppInner({
  router,
  navItems,
  handleThemeToggle,
  slots,
  appName,
  onTrackEvent,
  enabledServices,
}: {
  router: ReturnType<typeof createAuroraRouter>
  navItems: NavigationItem[]
  handleThemeToggle: (theme: string) => void
  slots?: Slots
  appName?: string
  onTrackEvent?: OnTrackEventCallback
  enabledServices?: string[]
}) {
  const auth = useAuth()

  // Handle chunk loading failures (e.g., when dev server crashes)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error

      // Chunk loading errors are TypeError instances with specific characteristics:
      // - filename contains chunk/asset paths (starts with http/https or /)
      // - message contains "import" or "fetch" keywords
      // This is more robust than matching exact error strings which vary by browser/bundler
      const isChunkError =
        error instanceof TypeError &&
        typeof error.message === "string" &&
        event.filename &&
        (event.filename.includes("/assets/") || event.filename.startsWith("http")) &&
        (/import/i.test(error.message) || /fetch.*module/i.test(error.message))

      if (isChunkError) {
        console.error("Chunk loading failed - dev server may have crashed:", error)
        event.preventDefault()

        // Show user-friendly error instead of white screen
        // Note: Cannot use React here as the error may have occurred during React's own chunk loading
        const root = document.getElementById("root")
        if (root) {
          root.innerHTML = `
            <div>
              <h1>Connection Lost</h1>
              <p>The development server has stopped responding.</p>
              <p>Check the terminal for build errors.</p>
              <button onclick="window.location.reload()">Reload</button>
            </div>
          `
        }
      }
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  const routerContext = {
    trpcReact,
    trpcClient,
    auth,
    navItems,
    handleThemeToggle,
    slots,
    appName,
    onTrackEvent,
    enabledServices,
  }

  // Set up analytics tracking for router navigation
  // Must run AFTER RouterProvider processes the context, so use a separate effect
  useEffect(() => {
    if (onTrackEvent) {
      return setupRouterAnalytics(router)
    }
  }, [router, onTrackEvent])

  return <RouterProvider router={router} context={routerContext} />
}

export default App
