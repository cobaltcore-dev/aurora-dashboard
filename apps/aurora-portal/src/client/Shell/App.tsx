// @ts-expect-error missing types
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { useState, lazy, Suspense } from "react"
import Navigation from "./Navigation"
import { trpcClient, trpc } from "../trpcClient"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// import ExtensionA from "extensions/@cobaltcore-dev/aurora-extension-a/dist/client/index"
import ExtensionA from "extensions/@cobaltcore-dev/aurora-extension-a/dist/client"

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
  extension?: boolean
  routerID?: string
}

const Apps: AppType[] = [
  {
    name: "home",
    component: lazy(() => import("./Home")),
  },
  {
    name: "compute",
    component: lazy(() => import("../Identity")),
  },
  {
    name: "identity",
    component: lazy(() => import("../Identity")),
  },
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
                <ExtensionA client={trpcClient} />
                {/* <ExtensionA client={trpcClient} /> */}
                <Suspense fallback={<div>Loading...</div>}>
                  {Apps.map(
                    (app, i) =>
                      active === i && (
                        <app.component key={i} client={app.extension && app.routerID ? trpcClient : trpcClient} />
                      )
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
