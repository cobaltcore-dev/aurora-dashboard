---
"@cobaltcore-dev/aurora": patch
"@cobaltcore-dev/dashboard": patch
---

fix(server): add trustProxy config option for correct hostname detection behind reverse proxy

When running behind a reverse proxy (Ingress), Fastify needs to read the
`X-Forwarded-Host` header to determine `req.hostname`. This fixes cross-domain
cookie sharing where cookies were incorrectly set with the host-specific domain
instead of the wildcard subdomain (e.g., `.qa-de-1.cloud.sap`).

Set `TRUST_PROXY=true` environment variable when running behind a proxy.
