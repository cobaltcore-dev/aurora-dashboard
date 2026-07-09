export {
  AuroraApp,
  type AuroraAppProps,
  type Slots,
  type SlotProps,
  type TrackEventPayload,
  type OnTrackEventCallback,
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
export { useDomainId, useProjectId } from "./hooks"
