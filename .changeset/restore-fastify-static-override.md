---
"@cobaltcore-dev/aurora": patch
---

Restore the `@fastify/static@<10.1.2` pnpm override. Without it, `@fastify/vite` pulls in `@fastify/static@9.3.0`, which is affected by two advisories:
- GHSA (route guard bypass via non-leading `..` / `%2E%2E` path segments, `<=10.1.0`)
- GHSA (authorization bypass via non-canonical URL paths, `<=10.1.1`)

The override forces the patched `10.1.2`. These are dev-dependency (`@fastify/vite`) vulnerabilities, so `pnpm audit --prod` did not surface them.
