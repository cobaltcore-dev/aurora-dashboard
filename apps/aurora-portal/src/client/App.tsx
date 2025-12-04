import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { router } from "./router"
import { RouterProvider } from "@tanstack/react-router"
import { AuthProvider, useAuth } from "./store/AuthProvider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpcReact, trpcClient, trpcReactClient } from "./trpcClient"
import { useState, useMemo, useRef } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ErrorBoundary } from "react-error-boundary"
import { Trans } from "@lingui/react/macro"
import { NavigationItem } from "./components/navigation/types"

type AppProps = {
  theme?: "theme-dark" | "theme-light"
}

const navItems: NavigationItem[] = [{ route: "/about", label: "About" }]

const currentTheme = (localStorage.getItem("aurora-theme") || "theme-light") as "theme-dark" | "theme-light"

const App = (props: AppProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  const themeRef = useRef<HTMLDivElement>(null)

  const [reactClient] = useState(() => trpcReactClient)

  const handleThemeToggle = (newTheme: string) => {
    if (themeRef.current) {
      themeRef.current.parentElement?.classList.remove("theme-light", "theme-dark")
      themeRef.current.parentElement?.classList.add(newTheme)
      localStorage.setItem("aurora-theme", newTheme)
    }
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div role="alert" style={{ padding: 24 }}>
          <p>
            <Trans>Something went wrong:</Trans>
          </p>
          <pre style={{ color: "red" }}>{error.message}</pre>
          <button onClick={resetErrorBoundary}>
            <Trans>Try again</Trans>
          </button>
        </div>
      )}
    >
      <I18nProvider i18n={i18n}>
        <AppShellProvider shadowRoot={false} theme={props.theme || currentTheme || "theme-light"}>
          <span ref={themeRef}></span>
          <trpcReact.Provider client={reactClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AppInner navItems={navItems} handleThemeToggle={handleThemeToggle} />
              </AuthProvider>
            </QueryClientProvider>
          </trpcReact.Provider>
        </AppShellProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}

function AppInner({
  navItems,
  handleThemeToggle,
}: {
  navItems: NavigationItem[]
  handleThemeToggle: (theme: string) => void
}) {
  const auth = useAuth()

  const routerContext = useMemo(() => ({ trpcReact, trpcClient, auth, navItems, handleThemeToggle }), [auth, navItems])

  return <RouterProvider router={router} context={routerContext} />
}

export default App
