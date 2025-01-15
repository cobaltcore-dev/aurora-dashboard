// @ts-expect-error missing types
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import React, { useState, lazy, Suspense, ReactNode } from "react"
import Navigation from "./Navigation"
import { trpcClient, trpc } from "../trpcClient"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ExtensionProps } from "../../shared/types/extension"

const Home = lazy(() => import("./Home"))
const Compute = lazy(() => import("../Compute"))
const Identity = lazy(() => import("../Identity"))

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

const ExtensionA = React.lazy(
  () => import("../../../extensions/@cobaltcore-dev/aurora-extension-a/dist/client/index.js")
)

const ExtensionB = React.lazy(
  () => import("../../../extensions/@cobaltcore-dev/aurora-extension-b/dist/client/index.js")
)

export default function App() {
  const [active, setActive] = useState<string>("home")
  const [queryClient] = useState(() => new QueryClient())

  const [extensions, setExtensions] = useState<ExtensionProps[]>([])

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppShellProvider stylesWrapper="head" shadowRoot={false}>
          <div className={`${shellStyles}`}>
            <Navigation extensions={extensions} active={active} handleActive={(name: string) => setActive(name)} />
            <div>
              <div className={contentStyles}>
                <Suspense fallback={<div>Loading...</div>}>
                  <ExtensionA client={trpcClient.extensionA} />
                  <ExtensionB client={trpcClient.extensionB} />
                  {active === "home" ? (
                    <Home />
                  ) : active === "identity" ? (
                    <Identity client={trpcClient} />
                  ) : active === "compute" ? (
                    <Compute client={trpcClient} />
                  ) : null}
                </Suspense>
              </div>
            </div>
          </div>
        </AppShellProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
