// src/server/api/index.ts
import { t } from "./trpc"
import { identityRouters } from "./Identity/routers"
import { RouterLike } from "@trpc/react-query/shared"
import { computeRouters } from "./Compute/routers"

// import { loadExtensionsRouters } from "./bootstrap"

// import { appRouter as extensionARouter } from "../../extensions/@cobaltcore-dev/aurora-extension-a/dist/server/routers/index.js"
import { appRouter as extensionARouter } from "../../extensions/@cobaltcore-dev/aurora-extension-a/src/server/routers/index.js"
import { appRouter as extensionBRouter } from "../../extensions/@cobaltcore-dev/aurora-extension-b/dist/server/routers/index.js"

// Combine the routers for the app
const coreRouter = t.mergeRouters(t.router(identityRouters), t.router(computeRouters))

const extensionsRouter = t.router({
  extensionA: extensionARouter,
  extensionB: extensionBRouter,
})

export const appRouter = t.mergeRouters(coreRouter, extensionsRouter)

// Export the AppRouter type for type safety
export type AuroraRouter = typeof appRouter

export type AuroraReactQueryRouter = RouterLike<AuroraRouter>
