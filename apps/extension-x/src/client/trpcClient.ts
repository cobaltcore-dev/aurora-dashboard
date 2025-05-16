import type { AppRouter } from "../server/routers"

import { createTRPCClient, httpBatchLink, TRPCClient } from "@trpc/client"

export type TrpcClient = TRPCClient<AppRouter>

export function initTrpcClient(bffPath: string): TrpcClient {
  // Create a TRPC client instance
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: bffPath,
      }),
    ],
  })
}
