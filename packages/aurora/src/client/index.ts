export {
  AuroraApp,
  type AuroraAppProps,
  type Slots,
  type SlotProps,
  type TrackEventPayload,
  type OnTrackEventCallback,
  type ServiceExtension,
  type ServiceExtensionProps,
  type ServiceExtensionContext,
} from "./AuroraApp"
export {
  type TrpcClient,
  type TrpcReact,
  type CreateTypedTrpcReact,
  type CreateTypedTrpcClient,
  trpcClient,
  trpcReactClient,
  trpcReact,
} from "./trpcClient"

export { useAuth } from "./store/AuthProvider"
export { useDomainId, useScope } from "./hooks"
export { createAuroraRouter } from "./router"
export type { RouteInfo, Crumb } from "./routes/routeInfo"
export { isRouteInfo } from "./routes/routeInfo"
export { usePushBreadcrumbs } from "./hooks/usePushBreadcrumbs"
export { useSetBreadcrumb } from "./hooks/useSetBreadcrumb"
export { useBreadcrumbs, type BreadcrumbItem } from "./hooks/useBreadcrumbs"
export { DynamicBreadcrumbContext, DynamicBreadcrumbProvider } from "./context/DynamicBreadcrumbContext"
export { ContentHeader as PageContentHeader } from "./components/ContentHeader/ContentHeader"
