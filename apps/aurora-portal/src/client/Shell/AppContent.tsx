import React, { Suspense, useEffect } from "react"

import { Home } from "./Home"
import { About } from "./About"
import { ComputeOverview } from "../Compute/ComputeOverview"
import { SignIn } from "../Auth/SignIn"
import { trpcClient } from "../trpcClient"
import { Route, Switch, Redirect } from "wouter"
import { ErrorBoundary } from "react-error-boundary"
import { lazy } from "react"
import { TrpcClient } from "../trpcClient"
import { clientExtensions } from "../generated/extensions"
import { NavigationLayout } from "./Navigation/NavigationLayout"
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
  const [isLoading, setIsLoading] = React.useState(true)
  const { isAuthenticated } = useAuth()
  const dispatch = useAuthDispatch()

  // sync auth status on mount
  useEffect(() => {
    trpcClient.auth.token
      .query()
      .then((token) =>
        token
          ? dispatch({ type: "LOGIN_SUCCESS", payload: { user: token?.user, sessionExpiresAt: token?.expires_at } })
          : dispatch({ type: "LOGOUT" })
      )
      .catch((error) => dispatch({ type: "LOGIN_FAILURE", payload: { error: error.message } }))

      .finally(() => setIsLoading(false))
  }, [dispatch])

  const navItems = [{ route: "/about", label: "About" }]

  if (isAuthenticated) {
    extensions.forEach((ext) => navItems.push({ route: `/${ext.id}`, label: ext.navigation?.label || ext.name }))
  }

  return (
    <>
      <div className="content">
        {isAuthenticated && <NavigationLayout mainNavItems={navItems} />}
        <div className="py-4 pl-4 bg-theme-global-bg h-full">
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <>
              <Switch>
                <Route path="auth/signin">
                  <SignIn trpcClient={trpcClient["auth"]} />
                </Route>

                <Route path="/about" component={About} />
                <Route path="/" component={Home} />
                <Route path="/:domainId" nest>
                  <Route path="/projects">
                    <ProjectsOverview client={trpcClient.project} />
                  </Route>

                  <Route path="/:domainId/:projectId/compute">
                    <ComputeOverview client={trpcClient} />
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

                {/* Default route in a switch */}
                <Route>404: No such page!</Route>
              </Switch>
              {!isAuthenticated && <Redirect to="/auth/signin" />}
            </>
          )}
        </div>
      </div>
    </>
  )
}
