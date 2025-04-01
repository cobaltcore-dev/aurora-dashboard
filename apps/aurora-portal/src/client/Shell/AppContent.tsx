import React, { Suspense, useEffect } from "react"

import { Home } from "./Home"
import { About } from "./About"
import { ComputeOverview } from "../Compute/ComputeOverview"
import { SignIn } from "../Auth/SignIn"
import { trpcClient } from "../trpcClient"
import { Route, Switch } from "wouter"
import { ErrorBoundary } from "react-error-boundary"
import { lazy } from "react"
import { TrpcClient } from "../trpcClient"
import { clientExtensions } from "../generated/extensions"
import { NavigationLayout } from "./Navigation/NavigationLayout"
import { NetworkOverview } from "../Network/NetworkOverview"
import { ProjectsOverview } from "../Project/ProejctsOverview"
import { useAuth, useAuthDispatch } from "../store/StoreProvider"
import { useAuroraContext } from "./AuroraProvider"
import { NavigationItem } from "./Navigation/types"
import { ProjectRescope } from "../Project/ProjectRescope"
type RouterScopes = keyof typeof trpcClient

interface ExtensionProps {
  client: TrpcClient[RouterScopes]
  getTokenFunc: () => string
}

interface Extension {
  id: string
  name: string
  navigation: {
    label: string
    scope: string[]
  }
  App: Promise<{ default: React.ComponentType<ExtensionProps> }>
  Logo?: Promise<{ default: React.ComponentType }>
}

const extensions = clientExtensions.map((ext: Extension) => ({
  ...ext,
  App: lazy(() => ext.App),
  Logo: lazy(() => ext.Logo || Promise.resolve({ default: () => null })),
}))

export function AppContent() {
  const [isLoading, setIsLoading] = React.useState(true)
  const { auroraRoutes } = useAuroraContext()
  const { isAuthenticated } = useAuth()
  const dispatch = useAuthDispatch()

  // sync auth status on mount
  useEffect(() => {
    trpcClient.auth.getCurrentUserSession
      .query()
      .then((token) =>
        token
          ? dispatch({ type: "LOGIN_SUCCESS", payload: { user: token?.user, sessionExpiresAt: token?.expires_at } })
          : dispatch({ type: "LOGOUT" })
      )
      .catch((error) => dispatch({ type: "LOGIN_FAILURE", payload: { error: error.message } }))

      .finally(() => setIsLoading(false))
  }, [dispatch])

  const navItems: NavigationItem[] = [{ route: auroraRoutes.about, label: "About" }]

  if (isAuthenticated) {
    extensions.forEach((ext) => navItems.push({ route: `/${ext.id}`, label: ext.navigation?.label || ext.name }))
  }
  return (
    <div className="content">
      {isAuthenticated && <NavigationLayout mainNavItems={navItems} />}
      <div className="py-4 pl-4 bg-theme-global-bg h-full">
        <Switch>
          <Route path={auroraRoutes.auth.signin}>
            <SignIn trpcClient={trpcClient.auth} />
          </Route>
          {isAuthenticated ? (
            <>
              <Route path={auroraRoutes.about} component={About} />
              <Route path={auroraRoutes.home} component={Home} />

              <Route path={auroraRoutes.domain(":domainId").projects}>
                <ProjectRescope client={trpcClient.auth}>
                  <ProjectsOverview client={trpcClient.project} />
                </ProjectRescope>
              </Route>
              <Route path={auroraRoutes.domain(":domainId").project(":projectId").compute.root}>
                <ProjectRescope client={trpcClient.auth}>
                  <ComputeOverview client={trpcClient} />
                </ProjectRescope>
              </Route>
              <Route path={auroraRoutes.domain(":domainId").project(":projectId").network.root}>
                <NetworkOverview />
              </Route>

              {extensions.map((ext, i) => (
                <Route key={i} path={`/${ext.id}`}>
                  <ErrorBoundary fallback={<div>Something went wrong</div>}>
                    <Suspense fallback={<div>Loading...</div>}>
                      <ext.App client={trpcClient[ext.id as RouterScopes]} getTokenFunc={() => ""} />
                    </Suspense>
                  </ErrorBoundary>
                </Route>
              ))}
            </>
          ) : (
            <>
              {isLoading ? (
                <span>Please wait while you session is synced...</span>
              ) : (
                <SignIn trpcClient={trpcClient.auth} />
              )}
            </>
          )}

          {/* Default route in a switch */}
          <Route>404: No such page!</Route>
        </Switch>
      </div>
    </div>
  )
}
