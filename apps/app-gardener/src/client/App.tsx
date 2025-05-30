import { TrpcClient } from "./trpcClient"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"

export interface AppProps {
  baseUrl: string
  trpcClient: TrpcClient
}

export function App({ baseUrl, trpcClient }: AppProps) {
  return <RouterProvider context={{ trpcClient }} router={router({ basepath: baseUrl || "/" })} />
}
