import { Suspense } from "react"

import { Breadcrumb } from "./Breadcrumb"
import { Home } from "./Home"
import { About } from "./About"
import { Overview as Compute } from "../Compute/Overview"
import { Overview as IdentityOverview } from "../Identity/Overview"
import { SignIn } from "../Identity/Auth/SignIn"
import { trpcClient } from "../trpcClient"
import { Route, Switch } from "wouter"
import { MainNavigation } from "./Navigation/MainNavigation"
import { useAuth } from "./AuthProvider"
import { ErrorBoundary } from "react-error-boundary"

type RouterScopes = keyof typeof trpcClient
import { lazy, ReactNode } from "react"
import { TrpcClient } from "../trpcClient"
import { clientExtensions } from "../generated/extensions"

interface ExtensionProps {
  client: TrpcClient
  getTokenFunc: () => string
}

type Extension = (props: ExtensionProps) => ReactNode

const extensions = clientExtensions.map((ext) => ({
  ...ext,
  App: lazy(() => ext.App) as Extension,
  Logo: ext.Logo ? lazy(() => ext.Logo) : null,
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
      <MainNavigation items={navItems} />
      <div>
        <div className="py-4 pl-4 bg-theme-global-bg h-full">
          <Breadcrumb />
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/about" component={About} />

            <Route path="auth/signin">
              <SignIn />
            </Route>
            {user && (
              <>
                <Route path="/compute">
                  <Compute client={trpcClient.compute} />
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
      </div>
    </>
  )
}
