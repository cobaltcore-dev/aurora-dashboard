import { createTRPCReact } from "@trpc/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { AuroraRouter } from "../server/routers"

declare const BFF_ENDPOINT: string

// Shared link configuration
const getLinks = () => [
  httpBatchLink({
    url: BFF_ENDPOINT,
    async headers() {
      const { csrfToken } = await fetch("/csrf-token").then((res) => res.json())
      return {
        "x-csrf-token": csrfToken,
      }
    },
  }),
]

// React Query client (for hooks like useQuery/useMutation)
export const trpcReact = createTRPCReact<AuroraRouter>()

// Vanilla client (for .query() and .mutate())
export const trpcClient = createTRPCClient<AuroraRouter>({
  links: getLinks(),
})

export type TrpcReact = typeof trpcReact
export type TrpcClient = typeof trpcClient
