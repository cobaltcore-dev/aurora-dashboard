---
"@cobaltcore-dev/aurora": minor
---

Add a reusable `create-service` Intent skill and move Intent tooling to the monorepo root.

The new `create-service` skill guides generating a new service end to end from an epic/task spec: a BFF list endpoint that proxies the OpenStack API, plus the client side (side-navigation entry, TanStack file route with breadcrumb, and a Juno DataGrid list view of the entity, delegated to the `build-data-grids` skill). It ships with the `@cobaltcore-dev/aurora` package (via `files` and `keywords`) and is loaded through TanStack Intent (`pnpm exec intent load "@cobaltcore-dev/aurora#create-service"`). It stays generic, deriving the entity shape, columns, filters, and OpenStack API from the spec (asking the developer for gaps) and mirroring an existing service's architecture rather than hardcoding any single service, with a mock-data fallback when the API is not yet known.

TanStack Intent consumer tooling moves from the `@cobaltcore-dev/aurora` package up to the monorepo root so any workspace package can use it: the `@tanstack/intent` dev dependency, the `intent.skills` allowlist, and the skill-loading guidance now live at the repository root, and agents run the standard `pnpm exec intent` from the root (no custom wrapper script) as the Intent docs specify. This removes the package-level `intent` wrapper script, the `intent`/`postinstall` npm scripts (the `postinstall` referenced `scripts/intent-bootstrap.mjs`, which was not part of the published `files`), and the per-package `AGENTS.md`/generated `CLAUDE.md`. The package keeps only its producer role.
