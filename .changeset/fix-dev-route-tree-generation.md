---
"@cobaltcore-dev/aurora": patch
---

Fix `routeTree.gen.ts` not being generated when running `pnpm run dev`.

In dev the dashboard serves aurora's source via the monorepo alias and uses the dashboard's own Vite config, so the dashboard must run the TanStack Router plugin to generate the route tree (as it already does for Tailwind, SVGR, and Lingui). The plugin was missing from the dashboard Vite config, so nothing generated `routeTree.gen.ts` and the dev server failed on the missing import in `router.ts`.

The router detail route (`network/routers/$routerId`) also passed a variable to `createFileRoute(...)` instead of a string literal. The TanStack Router generator statically parses that argument and threw, aborting generation of the whole tree. The route id is now inlined as a string literal (kept in sync with the `ROUTE_ID` const the `useParams` calls reuse).

