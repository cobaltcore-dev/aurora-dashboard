---
"@cobaltcore-dev/aurora": patch
---

- Add security warning to session cookie domain configuration about cross-subdomain trust requirements
- Derive floating IP tenant_id and project_id from authenticated session instead of client input to prevent ownership confusion
