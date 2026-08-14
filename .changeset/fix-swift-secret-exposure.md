---
"@cobaltcore-dev/aurora": major
---

Redact Swift TempURL and sync keys from metadata responses. Container and account metadata now return presence flags (`hasTempUrlKey`, `hasSyncKey`) instead of raw secret values, preventing unauthorized object access.
