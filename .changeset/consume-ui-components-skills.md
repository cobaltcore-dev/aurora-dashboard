---
"@cobaltcore-dev/aurora": minor
---

Consume TanStack Intent skills published by `@cloudoperators/juno-ui-components` (bumped to 9.7.1). Set up Intent as a consumer at the monorepo root: `@tanstack/intent` dev dependency, an `intent.skills` allowlist, and skill-loading guidance in `AGENTS.md`.

Also fix `routeTree.gen.ts` not being generated on `pnpm run dev` by adding the TanStack Router plugin to the dashboard's Vite config and inlining the `network/routers/$routerId` route id as a string literal (the generator rejects a variable).
