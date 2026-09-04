---
"@cobaltcore-dev/aurora": patch
"@cobaltcore-dev/dashboard": patch
---

fix: update dependencies to resolve security vulnerabilities

- Update fastify to 5.12.1 (fixes CVE-2026-3635 trustProxy spoofing)
- Update @commitlint/cli and @commitlint/config-conventional to 21.2.2
- fast-uri updated to 3.1.6 and 4.1.3 (fixes CVE-2026-13676 variants)
- Remove obsolete security overrides from pnpm-workspace.yaml
