export { getAuroraProvider } from "./server/aurora-provider"
export { AuroraSDKTRPCError, AuroraSDKError } from "./server/errors"
export { auroraFastifyTRPCPlugin } from "./server/fastify"
export { createAuroraOpenstackDevContext } from "./server/aurora-dev-context"

export {
  createAuroraTRPCReact,
  auroraHttpBatchLink,
  AuroraReactQueryClient,
  AuroraReactQueryClientProvider,
} from "./client"

export type { AuroraFastifyTRPCPluginOptions, CreateAuroraFastifyContextOptions } from "./server/fastify"
export type { AuroraContext, Token, AuroraSession } from "./server/aurora-context"
export type { AuroraReactQueryRouterLike } from "./server/aurora-query"
