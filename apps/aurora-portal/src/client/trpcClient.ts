import { createTRPCReact } from "@trpc/react-query"
import {
  createTRPCClient,
  httpBatchLink,
  httpBatchStreamLink,
  httpLink,
  splitLink,
  isNonJsonSerializable,
  httpSubscriptionLink,
} from "@trpc/client"
import type { AuroraRouter } from "../server/routers"

declare const BFF_ENDPOINT: string

// CSRF headers factory
const getCsrfHeaders = async () => {
  try {
    const { csrfToken } = await fetch("/csrf-token").then((res) => res.json())
    return {
      "x-csrf-token": csrfToken,
    }
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error)
    return {}
  }
}

// Procedures that return async iterables (chunked streaming responses).
// These are routed through httpBatchStreamLink instead of httpBatchLink.
// Add any new streaming procedure paths here.
const STREAMING_PROCEDURES = new Set<string>(["storage.swift.downloadObject"])

// Shared link configuration with nested splitLink for subscriptions + non-JSON data
const getLinks = () => [
  splitLink({
    // First check: is it a subscription?
    condition: (op) => op.type === "subscription",
    // Use HTTP subscription link for subscriptions (long-polling)
    true: httpSubscriptionLink({
      url: BFF_ENDPOINT,
      // Callback to populate headers
      eventSourceOptions: async () => {
        return { headers: await getCsrfHeaders() }
      },
    }),
    // For non-subscriptions, check for non-JSON data or streaming procedures
    false: splitLink({
      // Non-JSON serializable input (FormData, Blob, ArrayBuffer, etc.) → plain httpLink.
      condition: (op) => isNonJsonSerializable(op.input),
      true: httpLink({
        url: BFF_ENDPOINT,
        async headers({ op }) {
          const csrf = await getCsrfHeaders()
          // Per-request headers can be injected via tRPC operation context.
          // op.context is set by the caller and forwarded through the link chain.
          const extra = (op.context as { headers?: Record<string, string> } | undefined)?.headers ?? {}
          return { ...csrf, ...extra }
        },
      }),
      // For JSON procedures, decide between streaming and regular batching
      false: splitLink({
        // Procedures returning async iterables must use httpBatchStreamLink.
        // httpBatchLink buffers the full response before resolving, which
        // breaks streaming. httpBatchStreamLink preserves batching while
        // supporting chunked/streamed responses.
        // Note: httpBatchStreamLink is intentionally NOT used globally because
        // it is incompatible with the @fastify/csrf-protection cookie rotation
        // used in this app — CSRF tokens can expire mid-stream on long-lived
        // connections. Scope it only to procedures that actually need streaming.
        condition: (op) => STREAMING_PROCEDURES.has(op.path),
        true: httpBatchStreamLink({
          url: BFF_ENDPOINT,
          async headers() {
            return getCsrfHeaders()
          },
        }),
        // Regular JSON mutations/queries — standard batching
        false: httpBatchLink({
          url: BFF_ENDPOINT,
          async headers() {
            return getCsrfHeaders()
          },
        }),
      }),
    }),
  }),
]

// React Query client (for hooks like useQuery/useMutation/useSubscription)
export const trpcReact = createTRPCReact<AuroraRouter>()
export const trpcReactClient = trpcReact.createClient({ links: getLinks() })

// Vanilla client (for .query() and .mutate())
export const trpcClient = createTRPCClient<AuroraRouter>({
  links: getLinks(),
})

export type TrpcReact = typeof trpcReact
export type TrpcClient = typeof trpcClient
