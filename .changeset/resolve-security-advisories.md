---
"@cobaltcore-dev/aurora": patch
---

Resolve security advisories via pnpm overrides:
- seroval / seroval-plugins: force patched 1.6.3 (fixes fromJSON thenable assimilation and related type confusion)
- source-map-js: force patched 1.2.2 (fixes event-loop DoS via indexed source-map section offsets)
- fastify: force patched 5.12.5 (fixes multiple advisories)
- @fastify/busboy: force patched 3.2.2
- brace-expansion: force patched 1.1.21 / 5.0.12 (fixes ReDoS)
