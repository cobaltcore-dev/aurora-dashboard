import { TrpcClient } from "./trpcClient"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"
import { AppShellProvider } from "@cloudoperators/juno-ui-components"

export interface AppProps {
  baseUrl: string
  trpcClient: TrpcClient
}

export function App({ baseUrl, trpcClient }: AppProps) {
  return (
    <AppShellProvider shadowRoot={false}>
      <RouterProvider context={{ trpcClient }} router={router({ basepath: baseUrl || "/" })} />
    </AppShellProvider>
  )
}
