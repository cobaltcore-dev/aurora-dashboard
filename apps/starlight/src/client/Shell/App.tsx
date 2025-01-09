// @ts-ignore
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { ReactNode, useState, lazy, Suspense } from "react"
import client from "../trpcClient"
import Navigation from "./Navigation"
import type { Manifest, Module } from "../../shared/types/manifest"
import type { ExtensionProps } from "../../shared/types/extension"

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
const component = (manifestEntry: Module | undefined) => {
  if (!manifestEntry || manifestEntry.type !== "core") {
    return () => <span>Could not find the component</span> // Return null if the manifest entry is not valid
  }

  let LazyComponent: React.LazyExoticComponent<React.ComponentType<any>>
  switch (manifestEntry.name) {
    case "compute":
      LazyComponent = lazy(() => import("../galaxy/compute/App"))
      break
    case "identity":
      LazyComponent = lazy(() => import("../galaxy/identity/App"))
      break
  }

  // Return a function component conforming to the `Extension` type
  return (props: ExtensionProps) => (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

export default function App({ manifest }: AppProps) {
  const [active, setActive] = useState<string>("home")
  const ActiveComponent = component(manifest.find((entry) => entry.name === active))

  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false}>
      <div className={`${shellStyles}`}>
        <Navigation manifest={manifest} active={active} handleActive={(name: string) => setActive(name)} />
        <div>
          <div className={contentStyles}>{active === "home" ? <Home /> : <ActiveComponent client={client} />}</div>
        </div>
      </div>
    </AppShellProvider>
  )
}
