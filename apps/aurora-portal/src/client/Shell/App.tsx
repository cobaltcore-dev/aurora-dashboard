import { useState, lazy, Suspense } from "react"
import { Route, Switch } from "wouter"
// @ts-expect-error missing types
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import Navigation from "./Navigation"
import { trpcClient, trpc } from "../trpcClient"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { registerClients } from "../generated/extensions"

const Home = lazy(() => import("./Home"))
const Compute = lazy(() => import("../Compute"))
const Identity = lazy(() => import("../Identity"))

type RouterScopes = keyof typeof trpcClient
//const result = trpcClient[ext.routerScope as RouterScopes];

const extensions = registerClients().map((ext) => ({
  label: ext.label,
  routerID: ext.routerScope,
  Component: lazy(() => ext.App),
  Logo: lazy(() => ext.Logo),
}))

const shellStyles = `
  grid
  grid-cols-[max-content_auto]
  grid-rows-[minmax(100vh,100%)]
`

const contentStyles = `
  py-4
  pl-4
  bg-theme-global-bg
  h-full
`

export default function App() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
          <div className={`${shellStyles}`}>
            <Navigation
              items={[
                { route: "/", label: "Home" },
                { route: "/compute", label: "Compute" },
                { route: "/identity", label: "Identity" },
                ...extensions.map((ext) => ({ route: `/${ext.routerID}`, label: ext.label })),
              ]}
            />
            <div>
              <div className={contentStyles}>
                <Suspense fallback={<div>Loading...</div>}>
                  <Switch>
                    <Route path="/" component={Home} />
                    <Route path="/compute">
                      <Compute api={trpc["compute"]} />
                    </Route>
                    <Route path="/identity">
                      <Identity api={trpc["identity"]} />
                    </Route>
                    {extensions.map((ext) => (
                      <Route key={ext.routerID} path={`/${ext.routerID}`}>
                        <ext.Component client={trpcClient[ext.routerID as RouterScopes]} />
                      </Route>
                    ))}
                    {/* Default route in a switch */}
                    <Route>404: No such page!</Route>
                  </Switch>
                </Suspense>
              </div>
            </div>
          </div>
        </AppShellProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
