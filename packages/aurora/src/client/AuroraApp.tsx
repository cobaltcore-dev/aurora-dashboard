import type { FC } from "react"
import type { TrpcClient } from "./trpcClient"
import App from "./App"

export type SlotProps = {
  auroraContext: {
    client: TrpcClient
  }
}

export type Slots = {
  sideNavBanner?: FC<SlotProps>
}

export type AuroraAppProps = {
  theme?: "theme-dark" | "theme-light"
  bffEndpoint?: string
  onThemeChange?: (theme: "theme-dark" | "theme-light") => void
  slots?: Slots
}

export const AuroraApp: FC<AuroraAppProps> = App
