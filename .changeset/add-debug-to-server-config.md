---
"@cobaltcore-dev/aurora": patch
---

feat(aurora): add debug option to AuroraServerConfig

Add missing `debug` configuration option to AuroraServerConfig and pass it
through to contextConfig, allowing consumers to explicitly control OpenStack
session debug logging behavior via server configuration.
