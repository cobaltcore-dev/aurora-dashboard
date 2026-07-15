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

// CSRF token cache with request deduplication
const csrfCache = {
  token: null as string | null,
  pending: null as Promise<string | null> | null,

  async getHeaders() {
    if (this.token) {
      return { "x-csrf-token": this.token }
    }

    // Dedupe concurrent fetches - only one request in flight at a time
    if (!this.pending) {
      this.pending = fetch("/csrf-token")
        .then((res) => res.json())
        .then(({ csrfToken }) => {
          this.token = csrfToken
          this.pending = null
          return csrfToken as string
        })
        .catch((error) => {
          this.pending = null
          console.error("Failed to fetch CSRF token:", error)
          return null
        })
    }

    const token = await this.pending
    return token ? { "x-csrf-token": token } : {}
  },

  invalidate() {
    this.token = null
  },
}

/**
 * Invalidate the cached CSRF token.
 * Call this when receiving a 403 response to trigger a fresh token fetch on the next request.
 */
export const invalidateCsrfToken = () => csrfCache.invalidate()

// Procedures that return async iterables (chunked streaming responses).
// These are routed through httpBatchStreamLink instead of httpBatchLink.
// Add any new streaming procedure paths here.
const STREAMING_PROCEDURES = new Set<string>(["storage.swift.downloadObject", "storage.ceph.objects.downloadObject"])

// BFF endpoint - set once by App before any tRPC calls are made
const config = {
  bffEndpoint: "/polaris-bff",
}

export function setBffEndpoint(endpoint: string) {
  config.bffEndpoint = endpoint
}

/**
 * Read the endpoint App configured. Needed by code that has to hand the value to
 * a separate JS context — a module Web Worker gets its own instance of this
 * module and never sees App's setBffEndpoint() call, so it would otherwise fall
 * back to the default and break any non-default deployment. Read-only: does not
 * affect link routing.
 */
export function getBffEndpoint() {
  return config.bffEndpoint
}

const getLinks = () => [
  splitLink({
    // First check: is it a subscription?
    condition: (op) => op.type === "subscription",
    // Use HTTP subscription link for subscriptions (long-polling)
    true: httpSubscriptionLink({
      url: config.bffEndpoint,
      // Callback to populate headers
      eventSourceOptions: async () => {
        return { headers: await csrfCache.getHeaders() }
      },
    }),
    // For non-subscriptions, check for non-JSON data or streaming procedures
    false: splitLink({
      // Non-JSON serializable input (FormData, Blob, ArrayBuffer, etc.) → plain httpLink.
      condition: (op) => isNonJsonSerializable(op.input),
      true: httpLink({
        url: config.bffEndpoint,
        async headers({ op }) {
          const csrf = await csrfCache.getHeaders()
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
          url: config.bffEndpoint,
          async headers() {
            return csrfCache.getHeaders()
          },
        }),
        // Regular JSON mutations/queries — standard batching
        false: httpBatchLink({
          url: config.bffEndpoint,
          async headers() {
            return csrfCache.getHeaders()
          },
        }),
      }),
    }),
  }),
]

// React Query client (for hooks like useQuery/useMutation/useSubscription)
export const trpcReact: TrpcReact = createTRPCReact<AuroraRouter>()

// Lazy-initialized clients - created on first access after setBffEndpoint() has been called by App
const clients = {
  react: null as ReturnType<typeof trpcReact.createClient> | null,
  vanilla: null as TrpcClient | null,
}

export const trpcReactClient = new Proxy({} as ReturnType<typeof trpcReact.createClient>, {
  get(_target, prop) {
    if (!clients.react) {
      clients.react = trpcReact.createClient({ links: getLinks() })
    }
    return (clients.react as Record<string | symbol, unknown>)[prop]
  },
})

export const trpcClient: TrpcClient = new Proxy({} as TrpcClient, {
  get(_target, prop) {
    if (!clients.vanilla) {
      clients.vanilla = createTRPCClient<AuroraRouter>({ links: getLinks() })
    }
    return (clients.vanilla as Record<string | symbol, unknown>)[prop]
  },
})
