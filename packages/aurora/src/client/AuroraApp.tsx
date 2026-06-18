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

/**
 * User navigation metadata for analytics and behavioral tracking.
 * Contains route information to track which features users are accessing.
 */
export type UserNavigationMetrics = {
  /** High-level section (e.g., "compute", "network", "storage") */
  section: string
  /** Specific service within the section (e.g., "images", "flavors") */
  service: string
  /** Full URL pathname */
  pathname: string
  /** Internal route identifier */
  routeId?: string
}

/**
 * Callback invoked when users navigate to track behavioral metrics.
 * Use this to send analytics data about feature usage patterns.
 */
export type OnUserNavigationCallback = (metrics: UserNavigationMetrics) => void

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
  /**
   * Analytics callback for tracking user navigation and feature usage.
   * Called whenever a user navigates to a route with section/service metadata.
   *
   * @example
   * ```tsx
   * function trackUserNavigation(metrics: UserNavigationMetrics) {
   *   const feature = `${metrics.section}_${metrics.service}`
   *   sendAnalytics('feature-usage', { feature, timestamp: Date.now() })
   * }
   *
   * <AuroraApp onUserNavigation={trackUserNavigation} />
   * ```
   */
  onUserNavigation?: OnUserNavigationCallback
}

export const AuroraApp: FC<AuroraAppProps> = App
