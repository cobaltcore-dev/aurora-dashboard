import { t } from "./trpc"
import { identityRouters } from "./Identity/routers"
import { RouterLike } from "@trpc/react-query/shared"
import { computeRouters } from "./Compute/routers"

import ext from "extensions/@cobaltcore-dev/aurora-extension-a/dist/server/routers"

// console.log(ext)

const coreRouter = t.mergeRouters(t.router(identityRouters), t.router(computeRouters))

export const appRouter = t.mergeRouters(coreRouter, ext)

export type AppRouter = typeof appRouter
