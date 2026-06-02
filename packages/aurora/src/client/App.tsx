import { AppShellProvider } from "@cloudoperators/juno-ui-components"
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
import { messages as enMessages } from "../locales/en/messages"

// Initialise i18n here so AuroraApp is self-contained and consumers don't need
// to set up Lingui before mounting the component.
i18n.load({ en: enMessages })
i18n.activate("en")

type AppProps = {
  theme?: "theme-dark" | "theme-light"
  bffEndpoint?: string
  onThemeChange?: (theme: "theme-dark" | "theme-light") => void
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
                <AppInner router={router} navItems={navItems} handleThemeToggle={handleThemeToggle} />
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
}: {
  router: ReturnType<typeof createAuroraRouter>
  navItems: NavigationItem[]
  handleThemeToggle: (theme: string) => void
}) {
  const auth = useAuth()

  const routerContext = {
    trpcReact,
    trpcClient,
    auth,
    navItems,
    handleThemeToggle,
  }

  return <RouterProvider router={router} context={routerContext} />
}

export default App
