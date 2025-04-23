import { inferAuroraRouterInputs, inferAuroraRouterOutputs } from "@cobaltcore-dev/aurora-sdk"
import type { AuroraRouter } from "../server/routers"

import { createAuroraTRPCClient } from "@cobaltcore-dev/aurora-sdk/client"

declare const BFF_ENDPOINT: string

// get the CSRF token from the server
// and set it in the headers
const headers = async () => {
  const { csrfToken } = await fetch("/csrf-token").then((res) => res.json())
  return {
    "x-csrf-token": csrfToken,
  }
}

export const trpcClient = createAuroraTRPCClient<AuroraRouter>(BFF_ENDPOINT, { headers })
export type TrpcClient = typeof trpcClient

export type AuroraRouterInput = inferAuroraRouterInputs<AuroraRouter>
export type AuroraRouterOutput = inferAuroraRouterOutputs<AuroraRouter>
