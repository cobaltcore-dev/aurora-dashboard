---
"@cobaltcore-dev/aurora": patch
---

Resolve Dependabot security advisories via pnpm overrides:
- glob: force patched >=14.0.2 (fixes AbortSignal cancellation bypass allowing post-timeout filesystem traversal, GHSA-3g3m-2fjr-6pw4), pulled in transitively through @fastify/static
- minimatch: force patched >=11.0.1 (fixes potential denial of service via globparts amplification, GHSA-g3hv-75wg-m249)
