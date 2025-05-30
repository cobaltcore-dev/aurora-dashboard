import type { GardenerRouter } from "../bff"

import { createTRPCClient, httpBatchLink, TRPCClient } from "@trpc/client"

export type TrpcClient = TRPCClient<GardenerRouter>

export function initTrpcClient(bffPath: string): TrpcClient {
  // Create a TRPC client instance
  return createTRPCClient<GardenerRouter>({
    links: [
      httpBatchLink({
        url: bffPath,
      }),
    ],
  })
}
