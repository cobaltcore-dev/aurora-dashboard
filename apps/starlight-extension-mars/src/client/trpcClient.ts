import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "../server/routers"

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      // @ts-expect-error missing env var
      url: BFF_ENDPOINT, // Ensure this matches your backend's tRPC path
    }),
  ],
})

export type TrpcClient = typeof trpcClient
