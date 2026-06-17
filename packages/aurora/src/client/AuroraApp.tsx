import type { FC } from "react"
import type { TrpcClient } from "./trpcClient"
import App from "./App"

/** Context object passed to every slot component. */
export type SlotProps = {
  auroraContext: {
    /** tRPC client for making API calls to the Aurora BFF. */
    client: TrpcClient
  }
}

/** Named extension points where consumers can inject their own React components. */
export type Slots = {
  /** Replaces the default Aurora logo in the page header. Renders outside shadow DOM — inherits header styles. */
  logo?: FC<SlotProps>
  /** Rendered at the bottom of the project side navigation. Renders inside a shadow DOM. */
  sideNavBanner?: FC<SlotProps>
  /** Replaces the default page footer. Renders outside shadow DOM — inherits page styles. */
  pageFooter?: FC<SlotProps>
}

/** Props for the top-level `<AuroraApp />` component. */
export type AuroraAppProps = {
  /** Initial theme. Defaults to `"theme-light"`. */
  theme?: "theme-dark" | "theme-light"
  /** URL prefix for all tRPC routes. Must match the server's `bffEndpoint`. Defaults to `"/polaris-bff"`. */
  bffEndpoint?: string
  /** Called when the user toggles the theme. Use this to persist the selection. */
  onThemeChange?: (theme: "theme-dark" | "theme-light") => void
  /** Optional UI extension points. */
  slots?: Slots
  /** App name shown in the header breadcrumb and as the default logo title. Defaults to `"Aurora"`. */
  appName?: string
}

export const AuroraApp: FC<AuroraAppProps> = App
