import { createRoot } from "react-dom/client"
import React from "react"
import MainComponent from "../client"
import type { Props as AppProps } from "../client"

export type { AppProps }

export function mount(container: HTMLElement, props: AppProps) {
  const root = createRoot(container)
  root.render(React.createElement(MainComponent, { ...props }))
}

export function unmount(container: HTMLElement) {
  const root = createRoot(container)
  root.unmount()
}
