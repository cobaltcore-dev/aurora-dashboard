import { inferAuroraRouterInputs, inferAuroraRouterOutputs } from "@cobaltcore-dev/aurora-sdk"
import type { AuroraRouter } from "../server/routers"

import { createAuroraTRPCClient } from "@cobaltcore-dev/aurora-sdk/client"

declare const BFF_ENDPOINT: string

export const trpcClient = createAuroraTRPCClient<AuroraRouter>(BFF_ENDPOINT)
export type TrpcClient = typeof trpcClient

export type AuroraRouterInput = inferAuroraRouterInputs<AuroraRouter>
export type AuroraRouterOutput = inferAuroraRouterOutputs<AuroraRouter>
