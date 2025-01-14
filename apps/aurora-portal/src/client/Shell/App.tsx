// @ts-expect-error missing types
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import React, { useState, Suspense } from "react"
import Navigation from "./Navigation"
import type { Manifest, Module } from "../../shared/types/manifest"
import type { ExtensionProps } from "../../shared/types/extension"
import { trpcClient, trpc } from "../trpcClient"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Compute from "../Compute/Compute"
import Home from "./Home"

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

interface AppProps {
  manifest: Manifest
}

// Define the component function
const component = (manifestEntry: Module | undefined): React.ComponentType<ExtensionProps> => {
  // Handle invalid or unsupported manifest entries
  if (!manifestEntry || manifestEntry.type !== "core") {
    return () => <span>Could not find the component</span>
  }

  // Return a function component that wraps the lazy-loaded component
  return () => {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <Compute computeApi={trpc.compute} />
      </Suspense>
    )
  }
}

export default function App({ manifest }: AppProps) {
  const [active, setActive] = useState<string>("home")
  const [queryClient] = useState(() => new QueryClient())
  const ActiveComponent = component(manifest.find((entry) => entry.name === active))

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppShellProvider stylesWrapper="head" shadowRoot={false}>
          <div className={`${shellStyles}`}>
            <Navigation manifest={manifest} active={active} handleActive={(name: string) => setActive(name)} />
            <div>
              <div className={contentStyles}>
                {active === "home" ? <Home /> : <ActiveComponent client={trpcClient} />}
              </div>
            </div>
          </div>
        </AppShellProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
