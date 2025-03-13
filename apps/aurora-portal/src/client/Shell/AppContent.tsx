import React, { Suspense, useEffect, useTransition } from "react"

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
  const { isAuthenticated } = useAuth()
  const dispatch = useAuthDispatch()

  const [isLoadingAuthStatus, startAuthStatusTransition] = useTransition()
  useEffect(() => {
    startAuthStatusTransition(async () => {
      await trpcClient.auth.getCurrentUserSession
        .query()
        .then((token) => dispatch({ type: "RECEIVE_AUTH_STATUS", payload: { token } }))
    })
  }, [])

  const navItems = [{ route: "/about", label: "About" }]

  if (isAuthenticated) {
    extensions.forEach((ext) => navItems.push({ route: `/${ext.id}`, label: ext.navigation?.label || ext.name }))
  }

  return (
    <div className="content">
      {isAuthenticated && <NavigationLayout mainNavItems={navItems} />}
      <div className="py-4 pl-4 bg-theme-global-bg h-full">
        <Switch>
          <Route path="auth/signin">
            <SignIn trpcClient={trpcClient.auth} />
          </Route>
          {isAuthenticated ? (
            <>
              <Route path="/about" component={About} />
              <Route path="/" component={Home} />
              <Route path="/:domainId" nest>
                <Route path="/projects">
                  <ProjectsOverview client={trpcClient.project} />
                </Route>

                <Route path="/:domainId/:projectId/compute">
                  <ComputeOverview client={trpcClient} />
                </Route>
                <Route path="/:domainId/:projectId/network">
                  <NetworkOverview client={trpcClient} />
                </Route>
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
              {isLoadingAuthStatus ? (
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
