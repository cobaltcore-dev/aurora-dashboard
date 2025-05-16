import { createRoot } from "react-dom/client"
import React from "react"
import { App, AppProps } from "../client/App"

export type { AppProps }

export function mount(container: HTMLElement, props: AppProps) {
  const root = createRoot(container)
  root.render(React.createElement(App, { ...props }))
}

export function unmount(container: HTMLElement) {
  const root = createRoot(container)
  root.unmount()
}
