import type { AppRouter } from "../server/routers"

import { createAuroraTRPCReact, auroraHttpBatchLink } from "@cobaltcore-dev/aurora-sdk"

type GlobalTypes = typeof window & {
  BFF_ENDPOINT: string
}

const url = (globalThis as GlobalTypes).BFF_ENDPOINT

export const trpc = createAuroraTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    auroraHttpBatchLink({
      url, // Ensure this matches your backend's tRPC path
    }),
  ],
})

export type TrpcClient = typeof trpcClient
