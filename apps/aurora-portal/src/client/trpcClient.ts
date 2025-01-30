import type { AuroraRouter } from "../polaris-bff/routers"

import { createAuroraTRPCReact, auroraHttpBatchLink } from "@cobaltcore-dev/aurora-sdk"

export const trpc = createAuroraTRPCReact<AuroraRouter>()

export const trpcClient = trpc.createClient({
  links: [
    auroraHttpBatchLink({
      // @ts-expect-error env does not exist
      url: BFF_ENDPOINT, // Ensure this matches your backend's tRPC path
    }),
  ],
})

export type TrpcClient = typeof trpcClient
