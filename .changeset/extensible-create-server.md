---
"@cobaltcore-dev/aurora": minor
---

Make `createServer` extensible for consumers. Extra tRPC routers can now be passed via `routers` in `AuroraServerConfig` and are merged into the Aurora router at startup, sharing the same context (session, cookies, OpenStack). The tRPC primitives needed to build compatible routers (`auroraRouter`, `protectedProcedure`, `projectScopedProcedure`, `domainScopedProcedure`, and the scoped input schemas) are now exported from the package. Built-in HTTP metrics collection has been removed from `createServer` — consumers can register their own metrics solution on the `FastifyInstance` returned before calling `.listen()`.
