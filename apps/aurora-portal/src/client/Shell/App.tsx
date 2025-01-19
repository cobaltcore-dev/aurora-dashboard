// @ts-expect-error missing types
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import React, { useState, lazy, Suspense } from "react"
import Navigation from "./Navigation"
import { trpcClient, trpc } from "../trpcClient"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { registerClients } from "extensions/client"

type RouterScopes = keyof typeof trpcClient
//const result = trpcClient[ext.routerScope as RouterScopes];

const extensions = registerClients().map((ext) => ({
  name: ext.extensionName,
  routerID: ext.routerScope,
  component: lazy(() => ext.App),
  Logo: lazy(() => ext.Logo),
  extension: true,
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

type AppComponentType = React.LazyExoticComponent<React.ComponentType<{ client: typeof trpcClient }>>
type AppType = {
  name: string
  component: AppComponentType
  Logo?: React.LazyExoticComponent<React.ComponentType>
  routerID?: string
  extension?: boolean
}

const Apps: AppType[] = [
  {
    name: "home",
    component: lazy(() => import("./Home")),
  },
  {
    name: "compute",
    component: lazy(() => import("../Compute")),
  },
  {
    name: "identity",
    component: lazy(() => import("../Identity")),
  },
  ...extensions,
]

export default function App() {
  const [active, setActive] = useState<number>(0)
  const [queryClient] = useState(() => new QueryClient())

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppShellProvider stylesWrapper="head" shadowRoot={false}>
          <div className={`${shellStyles}`}>
            <Navigation
              apps={Apps.map((app) => app.name)}
              active={active}
              handleActive={(index: number) => setActive(index)}
            />
            <div>
              <div className={contentStyles}>
                <Suspense fallback={<div>Loading...</div>}>
                  {Apps.map(
                    (app, i) =>
                      active === i &&
                      (app.routerID ? (
                        <app.component key={i} client={trpcClient[app.routerID as RouterScopes]} />
                      ) : (
                        <app.component key={i} />
                      ))
                  )}
                </Suspense>
              </div>
            </div>
          </div>
        </AppShellProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
