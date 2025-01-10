// src/server/api/index.ts
import { router } from "../shared/trpc"
import { identityRouters } from "./Identity/routers"
import { computeRouters } from "./Compute/routers"

// Combine the routers for the app
export const appRouter = router({
  ...identityRouters,
  ...computeRouters,
})

// Export the AppRouter type for type safety
export type AppRouter = typeof appRouter
