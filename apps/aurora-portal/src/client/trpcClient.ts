import { createTRPCReact } from "@trpc/react-query"
import { createTRPCClient, httpBatchLink, httpLink, splitLink, isNonJsonSerializable } from "@trpc/client"
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

// Shared link configuration with splitLink for non-JSON data support
const getLinks = () => [
  splitLink({
    // Check if the input contains non-JSON serializable data
    condition: (op) => isNonJsonSerializable(op.input),
    // Use httpLink for FormData, Blob, ArrayBuffer, etc.
    true: httpLink({
      url: BFF_ENDPOINT,
      async headers() {
        return getCsrfHeaders()
      },
    }),
    // Use httpBatchLink for regular JSON data (batching for performance)
    false: httpBatchLink({
      url: BFF_ENDPOINT,
      async headers() {
        return getCsrfHeaders()
      },
    }),
  }),
]

// React Query client (for hooks like useQuery/useMutation)
export const trpcReact = createTRPCReact<AuroraRouter>()
export const trpcReactClient = trpcReact.createClient({ links: getLinks() })

// Vanilla client (for .query() and .mutate())
export const trpcClient = createTRPCClient<AuroraRouter>({
  links: getLinks(),
})

export type TrpcReact = typeof trpcReact
export type TrpcClient = typeof trpcClient
