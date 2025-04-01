export type { AuroraContext } from "./aurora-context"
export type { AuroraFastifyTRPCPluginOptions, CreateAuroraFastifyContextOptions } from "./fastify"
export type {
  inferRouterInputs as inferAuroraRouterInputs,
  inferRouterOutputs as inferAuroraRouterOutputs,
} from "@trpc/server"

export { createAuroraDevelopmentContext } from "./aurora-dev-context"
export { AuroraSDKError, AuroraTRPCError } from "./aurora-error"
export { getAuroraProvider } from "./aurora-provider"
export { auroraFastifyTRPCPlugin } from "./fastify"
