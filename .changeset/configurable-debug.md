---
"@cobaltcore-dev/aurora": minor
---

feat(aurora): make OpenStack session debug logging configurable

Add optional `debug` field to `ContextConfig` to allow consumers to control
debug logging in SignalOpenstackSession. Falls back to existing behavior
(enabled in non-production) when not explicitly set.
