import { getAuroraProvider } from "@cobaltcore-dev/aurora-sdk"
import type { AuroraPortalContext } from "./context"
// You can use any variable name you like.
// We use t to keep things simple.
const auroraProvider = getAuroraProvider<AuroraPortalContext>()

export const auroraRouter = auroraProvider.getAuroraRouter
export const mergeRouters = auroraProvider.getAuroraMergeRouters
export const publicProcedure = auroraProvider.getAuroraPublicProcedure
export const protectedProcedure = auroraProvider.getAuroraProtectedProcedure
