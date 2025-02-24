import React, { Suspense } from "react"

import { Home } from "./Home"
import { About } from "./About"
import { ComputeOverview } from "../Compute/ComputeOverview"
import { Overview as IdentityOverview } from "../Identity/Overview"
import { SignIn } from "../Identity/Auth/SignIn"
import { trpcClient } from "../trpcClient"
import { Route, Switch } from "wouter"
import { useAuth } from "./AuthProvider"
import { ErrorBoundary } from "react-error-boundary"
import { lazy } from "react"
import { TrpcClient } from "../trpcClient"
import { clientExtensions } from "../generated/extensions"
import { NavigationLayout } from "./Navigation/NavigationLayout"

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
  const { user } = useAuth()
  const navItems = [
    { route: "/", label: "Home" },
    { route: "/about", label: "About" },
  ]

  if (user) {
    navItems.push({ route: "/compute", label: "Compute" })
    navItems.push({ route: "/identity", label: "Identity" })
    extensions.forEach((ext) => navItems.push({ route: `/${ext.id}`, label: ext.navigation?.label || ext.name }))
  }

  return (
    <>
      <NavigationLayout mainNavItems={navItems} subNavItems={navItems} />
      <div className="py-4 pl-4 bg-theme-global-bg h-full">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />

          <Route path="auth/signin">
            <SignIn />
          </Route>
          {user && (
            <>
              <Route path="/compute">
                <ComputeOverview client={trpcClient.compute} />
              </Route>
              <Route path="/identity">
                <IdentityOverview />
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
          )}

          {/* Default route in a switch */}
          <Route>404: No such page!</Route>
        </Switch>
      </div>
    </>
  )
}
