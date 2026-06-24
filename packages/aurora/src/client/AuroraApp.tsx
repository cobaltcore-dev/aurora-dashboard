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
 * Payload for analytics tracking events.
 * Generic structure that supports multiple event sources (router, links, modals, etc.)
 */
export type TrackEventPayload = {
  /** Source of the event (e.g., "router", "external-link", "modal", "button") */
  source: string
  /** Action identifier describing what happened (e.g., route ID, button name, link URL) */
  action: string
  /** Additional context specific to the source. For router: pathname, section, service. For links: href, target. */
  metadata?: Record<string, string | number | boolean | undefined>
}

/**
 * Callback invoked when users interact with trackable features.
 * Use this to send analytics data about feature usage patterns.
 */
export type OnTrackEventCallback = (payload: TrackEventPayload) => void

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
   * Analytics callback for tracking user interactions and feature usage.
   * Called for various user actions like navigation, external link clicks, etc.
   *
   * @example
   * ```tsx
   * function trackEvent(payload: TrackEventPayload) {
   *   // Router navigation: payload.action = "/_auth/projects/$projectId/compute/images"
   *   // External link: payload.action = "https://docs.example.com"
   *   sendAnalytics('user-interaction', {
   *     action: payload.action,
   *     source: payload.source,
   *     ...payload.metadata,
   *     timestamp: Date.now()
   *   })
   * }
   *
   * <AuroraApp onTrackEvent={trackEvent} />
   * ```
   */
  onTrackEvent?: OnTrackEventCallback
}

export const AuroraApp: FC<AuroraAppProps> = App
