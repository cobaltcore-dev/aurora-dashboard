---
"@cobaltcore-dev/aurora": patch
---

Patch security advisories in dev dependencies:
- vitest: bump to ^4.1.11 (fixes @vitest/mocker path traversal / arbitrary file read)
- js-yaml: force patched 3.15.2 / 4.3.2 (fixes maxTotalMergeKeys CPU DoS)
- esbuild: force patched >=0.28.1 (fixes dev-server arbitrary file read)
