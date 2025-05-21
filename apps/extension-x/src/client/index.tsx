import { StrictMode } from "react"
import { App, AppProps } from "./App"
import { initTrpcClient } from "./trpcClient"

export interface Props extends Omit<AppProps, "trpcClient"> {
  bffPath: string
}

export default function ({ bffPath, ...appProps }: Props) {
  const trpcClient = initTrpcClient(bffPath)

  return (
    <StrictMode>
      <App trpcClient={trpcClient} {...appProps} />
    </StrictMode>
  )
}
