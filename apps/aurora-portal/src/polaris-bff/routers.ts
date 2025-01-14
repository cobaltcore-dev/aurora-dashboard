// src/server/api/index.ts
import { router } from "./trpc"
import { identityRouters } from "./Identity/routers"
import { RouterLike } from "@trpc/react-query/shared"
import { computeRouters } from "./Compute/routers"

// Combine the routers for the app
export const appRouter = router({
  ...identityRouters,
  ...computeRouters,
})

// Export the AppRouter type for type safety
export type AuroraRouter = typeof appRouter

export type AuroraReactQueryRouter = RouterLike<AuroraRouter>
