import type { AppRouter } from "../bff/routers"

import { createAuroraTRPCClient } from "@cobaltcore-dev/aurora-sdk/client"

declare const BFF_ENDPOINT: string

export const trpcClient = createAuroraTRPCClient<AppRouter>(BFF_ENDPOINT)

export type TrpcClient = typeof trpcClient
