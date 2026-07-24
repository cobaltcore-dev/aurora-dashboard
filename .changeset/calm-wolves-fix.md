---
"@cobaltcore-dev/aurora": patch
---

Fix React-dependent packages incorrectly listed as `dependencies` instead of `peerDependencies`, and improve developer experience so workspace package changes are reflected immediately without rebuilding.

**Dependency fix:** Packages that use React context or hooks (`@lingui/react`, `@tanstack/react-query`, `@tanstack/react-router`, and others) were installed as private dependencies, causing consuming apps to end up with duplicate React instances. This produced "Invalid hook call" errors and silently disconnected context providers from their hooks. All React-context-using packages are now declared as `peerDependencies`. See `docs/0014_dependency_classification.md` for the classification rules.

**Developer experience:** `packages/policy-engine` and `packages/signal-openstack` had an `exports` field that caused Node to always resolve them from their compiled `dist/` regardless of tsconfig path mappings. Since both packages are private (never published), the `exports` field has been removed. Node now falls back to `main`, and tsx's tsconfig path mappings route to TypeScript source directly. Combined with an updated `dev` script that watches server-side workspace package source, changes to any workspace package are picked up immediately by the dev server, no rebuild step required. Types are always up to date since the editor reads directly from source.
