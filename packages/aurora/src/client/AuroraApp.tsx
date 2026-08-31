import type { FC } from "react"
import type { TRPCClient } from "@trpc/client"
import type { AnyRouter as TrpcAnyRouter } from "@trpc/server"
import App from "./App"

/** Context object passed to every slot component. */
export type SlotProps = {
  auroraContext: {
    /** tRPC client for making API calls to the Aurora BFF. Typed as AnyRouter so consumers can pass their extended client without a type cast. */
    client: TRPCClient<TrpcAnyRouter>
    /** Current service key of the slot component*/
    currentService?: string
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
  /** Replaces the default login form. Use in OIDC environments where password-based login is not needed. Renders outside shadow DOM. */
  login?: FC<SlotProps>
  /** Rendered inline next to each side navigation item label and service card. Receives `auroraContext.currentService` — return null to hide for that service. Renders outside shadow DOM. */
  serviceBadge?: FC<SlotProps>
  /** Rendered in the service page header actions area, beside the page title. Use to inject custom actions like "View in Elektra". Renders outside shadow DOM. */
  servicePageActions?: FC<SlotProps>
  /** Rendered below the "Projects" heading on the projects list page. Renders outside shadow DOM. */
  projectsBanner?: FC<SlotProps>
  /** Rendered below the project description on the project overview page (/projects/$projectId). Renders outside shadow DOM. */
  projectOverviewBanner?: FC<SlotProps>
  /** Rendered below the page title divider on every service page. Receives `auroraContext.currentService`. Renders outside shadow DOM. */
  serviceBanner?: FC<SlotProps>
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

/**
 * Host-provided data handed to a mounted service extension. Extend this as extensions need more
 * from OSS (domainId, scope, a typed tRPC client, ...). Seed it into the extension's own router
 * context so pages can read it via `useRouteContext`.
 */
export type ServiceExtensionContext = {
  /** The current project ID. */
  projectId: string
}

/**
 * Props passed to a service extension component mounted by OSS.
 * The basePath is the full URL prefix up to and including the service type segment.
 */
export type ServiceExtensionProps = {
  /** Full URL prefix for this service, e.g. "/projects/abc/services/pca". Pass as `basepath` to RouterProvider. */
  basePath: string
  /** Host context to seed into the extension's own router context. */
  context: ServiceExtensionContext
}

/**
 * A project-scoped service extension a consumer wants to register.
 * Aurora checks `serviceIndex[serviceType][serviceName]` against the project's OpenStack catalog.
 * When present, the service appears in the "Services" nav section and its component is mounted
 * under `/projects/$projectId/services/$serviceType`. The component receives `basePath` and
 * `context` — use these to set up a standalone RouterProvider for the service.
 */
export type ServiceExtension = {
  /** OpenStack catalog service type, e.g. `"pca"`. */
  serviceType: string
  /** OpenStack catalog service name, e.g. `"clavis"`. */
  serviceName: string
  /** Nav item and service card label. */
  label: string
  /**
   * The React component to render at `/projects/$projectId/services/$serviceType/**`.
   * Receives `basePath` (the URL prefix) and `context` (host data). Create your own RouterProvider
   * inside this component using `basePath` as the `basepath` prop and `context` as the router context.
   */
  component: FC<ServiceExtensionProps>
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
  /** Whitelist of service keys to show in the side nav and project home page. When omitted, all available services are shown. */
  enabledServices?: string[]
  /** Service extensions to register. Each is activated when its OpenStack service appears in the project catalog. */
  serviceExtensions?: ServiceExtension[]
}

export const AuroraApp: FC<AuroraAppProps> = App
