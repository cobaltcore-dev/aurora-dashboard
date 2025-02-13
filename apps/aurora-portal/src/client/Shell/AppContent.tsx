import { lazy, Suspense } from "react"

import Breadcrumb from "./Breadcrumb"
const Home = lazy(() => import("./Home"))
const About = lazy(() => import("./About"))
const Compute = lazy(() => import("../Compute"))
const IdentityOverview = lazy(() => import("../Identity/Overview"))
const SignIn = lazy(() => import("../Identity/Auth/SignIn"))
import { trpcClient } from "../trpcClient"
import { registerClients } from "../generated/extensions"
import { Route, Switch } from "wouter"
import Navigation from "./Navigation"
import { useAuth } from "./AuthProvider"

type RouterScopes = keyof typeof trpcClient

const extensions = registerClients().map((ext) => ({
  label: ext.label,
  routerID: ext.routerScope,
  scope: ext.scope,
  Component: lazy(() => ext.App),
  Logo: lazy(() => ext.Logo),
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
    extensions.forEach((ext) => navItems.push({ route: `/${ext.routerID}`, label: ext.label }))
  }

  return (
    <>
      <Navigation items={navItems} />
      <div>
        <div className="py-4 pl-4 bg-theme-global-bg h-full">
          <Breadcrumb />
          <Suspense fallback={<div>Loading...</div>}>
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

                  {extensions.map((ext) => (
                    <Route key={ext.routerID} path={`/${ext.routerID}`}>
                      <ext.Component client={trpcClient[ext.routerID as RouterScopes]} />
                    </Route>
                  ))}
                </>
              )}

              {/* Default route in a switch */}
              <Route>404: No such page!</Route>
            </Switch>
          </Suspense>
        </div>
      </div>
    </>
  )
}
