import { createTRPCReact } from "@trpc/react-query"
import type { CreateTRPCReact } from "@trpc/react-query"
import { createTRPCClient, type TRPCClient } from "@trpc/client"
import {
  httpBatchLink,
  httpBatchStreamLink,
  httpLink,
  splitLink,
  isNonJsonSerializable,
  httpSubscriptionLink,
} from "@trpc/client"
import type { AuroraRouter } from "../server/routers"

/** Type alias for the React tRPC client */
export type TrpcReact = ReturnType<typeof createTRPCReact<AuroraRouter>>

/** Type alias for the vanilla tRPC client */
export type TrpcClient = ReturnType<typeof createTRPCClient<AuroraRouter>>

/** Generic type for creating a typed React tRPC client with a custom router */
export type CreateTypedTrpcReact<TRouter extends AuroraRouter> = CreateTRPCReact<TRouter, unknown>

/** Generic type for creating a typed vanilla tRPC client with a custom router */
export type CreateTypedTrpcClient<TRouter extends AuroraRouter> = TRPCClient<TRouter>

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
const STREAMING_PROCEDURES = new Set<string>(["storage.swift.downloadObject", "storage.ceph.objects.downloadObject"])

// Mutable endpoint — set once by App before any tRPC calls are made.
let _bffEndpoint = "/polaris-bff"

export function setBffEndpoint(endpoint: string) {
  _bffEndpoint = endpoint
}

const getLinks = () => [
  splitLink({
    // First check: is it a subscription?
    condition: (op) => op.type === "subscription",
    // Use HTTP subscription link for subscriptions (long-polling)
    true: httpSubscriptionLink({
      url: _bffEndpoint,
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
        url: _bffEndpoint,
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
          url: _bffEndpoint,
          async headers() {
            return getCsrfHeaders()
          },
        }),
        // Regular JSON mutations/queries — standard batching
        false: httpBatchLink({
          url: _bffEndpoint,
          async headers() {
            return getCsrfHeaders()
          },
        }),
      }),
    }),
  }),
]

// React Query client (for hooks like useQuery/useMutation/useSubscription)
export const trpcReact: TrpcReact = createTRPCReact<AuroraRouter>()

let _trpcReactClient: ReturnType<typeof trpcReact.createClient> | null = null
let _trpcClient: TrpcClient | null = null

// Lazily initialised — created on first access after setBffEndpoint() has been called by App.
export const trpcReactClient = new Proxy({} as ReturnType<typeof trpcReact.createClient>, {
  get(_target, prop) {
    if (!_trpcReactClient) {
      _trpcReactClient = trpcReact.createClient({ links: getLinks() })
    }
    return (_trpcReactClient as Record<string | symbol, unknown>)[prop]
  },
})

export const trpcClient: TrpcClient = new Proxy({} as TrpcClient, {
  get(_target, prop) {
    if (!_trpcClient) {
      _trpcClient = createTRPCClient<AuroraRouter>({ links: getLinks() })
    }
    return (_trpcClient as Record<string | symbol, unknown>)[prop]
  },
})
