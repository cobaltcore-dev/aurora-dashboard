import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "../polaris-bff/routers"

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      // @ts-expect-error env does not exist
      url: BFF_ENDPOINT, // Ensure this matches your backend's tRPC path
    }),
  ],
})

export type TrpcClient = typeof trpcClient
