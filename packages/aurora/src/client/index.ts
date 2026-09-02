export {
  AuroraApp,
  type AuroraAppProps,
  type Slots,
  type SlotProps,
  type TrackEventPayload,
  type OnTrackEventCallback,
  type AdditionalProjectService,
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
export { useDomainId, useProjectId, useScope } from "./hooks"
export { servicesRoute } from "./routes/_auth/projects/$projectId/services"
export type { RouteInfo, Crumb } from "./routes/routeInfo"
export { isRouteInfo } from "./routes/routeInfo"
export { usePushBreadcrumbs } from "./hooks/usePushBreadcrumbs"
export { useSetBreadcrumb } from "./hooks/useSetBreadcrumb"
export { useBreadcrumbs, type BreadcrumbItem } from "./hooks/useBreadcrumbs"
export { DynamicBreadcrumbContext, DynamicBreadcrumbProvider } from "./context/DynamicBreadcrumbContext"
