import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App, AppProps } from "./App"
import { initTrpcClient } from "./trpcClient"
import { ClientConfig, RegisterClientFunction } from "@cobaltcore-dev/extension-sdk"

export type Props = Omit<AppProps, "trpcClient"> & {
  bffPath: string
}

const mount = (container: HTMLElement, props?: Props) => {
  const root = createRoot(container)
  if (!props) {
    throw new Error("Props are required for mounting the extension client.")
  }
  const trpcClient = initTrpcClient(props.bffPath)

  root.render(
    <StrictMode>
      <App trpcClient={trpcClient} {...props} />
    </StrictMode>
  )
}

const unmount = (container: HTMLElement) => {
  const root = createRoot(container)
  root.unmount()
}

export { mount, unmount }
