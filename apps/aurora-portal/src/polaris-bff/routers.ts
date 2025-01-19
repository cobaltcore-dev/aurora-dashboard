import { t } from "./trpc"
import { identityRouters } from "./Identity/routers"
import { RouterLike } from "@trpc/react-query/shared"
import { computeRouters } from "./Compute/routers"
import { registerServers } from "extensions/server"

const coreRouter = t.mergeRouters(t.router(identityRouters), t.router(computeRouters))
const extensionRouters = registerServers()

export const appRouter = t.mergeRouters(coreRouter, t.router(extensionRouters))

export type AppRouter = Awaited<typeof appRouter>
