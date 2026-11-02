---
"@cobaltcore-dev/aurora": patch
---

Resolve Dependabot security advisories via dependency bumps and pnpm overrides:
- zod: force patched >=4.6.6 (fixes memory exhaustion via oversized constrained collections, GHSA-mrhx-c7xc-m3w5)
- undici: force patched >=7.30.1 and >=8.12.2 (fixes DoS via excessive content-encodings, EventSource unbounded memory, and SRI bypass)
- fast-uri: force patched >=3.1.9 / >=4.2.3 (fixes scheme spoofing, host confusion, scheme injection, path equivalence)
- vite: force patched >=8.2.4 (fixes dev-server fs allow-list bypasses)
- @vitest/mocker: force patched >=4.1.12 (fixes code injection and Windows backslash traversal in manual mock registration)
- fastify: force patched 5.12.6 (fixes header validation bypass via case-sensitive propertyNames)
