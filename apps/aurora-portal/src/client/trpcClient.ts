import type { AppRouter } from "../polaris-bff/routers"

import { createTRPCReact, httpBatchLink } from "@trpc/react-query"

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // @ts-expect-error env does not exist
      url: BFF_ENDPOINT, // Ensure this matches your backend's tRPC path
    }),
  ],
})

export type TrpcClient = typeof trpcClient
