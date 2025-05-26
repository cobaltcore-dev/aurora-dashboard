import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App, AppProps } from "./App"
import { initTrpcClient } from "./trpcClient"
import { ClientConfig, RegisterClientFunction } from "@cobaltcore-dev/extension-sdk"

export type Props = Omit<AppProps, "trpcClient" | "baseUrl">

const registerClient: RegisterClientFunction<Props> = (config?: ClientConfig) => {
  const baseUrl = config?.mountRoute ?? ""
  const bffPath = `${baseUrl}/_bff`

  const mount = (container: HTMLElement, props?: Props) => {
    const root = createRoot(container)
    const trpcClient = initTrpcClient(bffPath)

    root.render(
      <StrictMode>
        <App trpcClient={trpcClient} baseUrl={baseUrl} {...props} />
      </StrictMode>
    )
  }

  const unmount = (container: HTMLElement) => {
    const root = createRoot(container)
    root.unmount()
  }

  return {
    mount,
    unmount,
  }
}

export { registerClient }
