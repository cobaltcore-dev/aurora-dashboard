export { createServer } from "./server"
export type { AuroraServerConfig } from "../types"
export {
  auroraRouter,
  publicProcedure,
  protectedProcedure,
  projectScopedProcedure,
  domainScopedProcedure,
  projectScopedInputSchema,
  domainScopedInputSchema,
} from "./trpc"
