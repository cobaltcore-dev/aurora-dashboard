// @ts-expect-error missing types
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import React, { useState, lazy, Suspense } from "react"
import { trpcClient } from "../trpcClient"
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
const component = (manifestEntry: Module | undefined): React.ComponentType<ExtensionProps> => {
  // Handle invalid or unsupported manifest entries
  if (!manifestEntry || manifestEntry.type !== "core") {
    return () => <span>Could not find the component</span>
  }

  // Lazy-loaded component variable
  let LazyComponent: React.LazyExoticComponent<React.ComponentType<ExtensionProps>> | null = null

  // Determine which component to load based on the manifest entry
  switch (manifestEntry.name) {
    case "compute":
      LazyComponent = lazy(() => import("../Compute")) // Adjust the import path as necessary
      break
    case "identity":
      LazyComponent = lazy(() => import("../Identity")) // Adjust the import path as necessary
      break
    default:
      return () => <span>Component not supported</span> // Fallback for unsupported names
  }

  // Return a function component that wraps the lazy-loaded component
  return (props: ExtensionProps) => {
    if (!LazyComponent) {
      return <span>Component failed to load</span> // Handle the case where LazyComponent is null
    }

    return (
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

export default function App({ manifest }: AppProps) {
  const [active, setActive] = useState<string>("home")
  const ActiveComponent = component(manifest.find((entry) => entry.name === active))

  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false}>
      <div className={`${shellStyles}`}>
        <Navigation manifest={manifest} active={active} handleActive={(name: string) => setActive(name)} />
        <div>
          <div className={contentStyles}>{active === "home" ? <Home /> : <ActiveComponent client={trpcClient} />}</div>
        </div>
      </div>
    </AppShellProvider>
  )
}
