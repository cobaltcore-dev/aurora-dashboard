import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { AuroraRouter } from "../server/routers"

declare const BFF_ENDPOINT: string

export const trpcClient = createTRPCClient<AuroraRouter>({
  links: [
    httpBatchLink({
      url: BFF_ENDPOINT,
      // You can pass any HTTP headers you wish here
      async headers() {
        const { csrfToken } = await fetch("/csrf-token").then((res) => res.json())
        return {
          "x-csrf-token": csrfToken,
        }
      },
    }),
  ],
})

export type TrpcClient = typeof trpcClient
