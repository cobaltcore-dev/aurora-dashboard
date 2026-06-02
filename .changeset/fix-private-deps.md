---
"@cobaltcore-dev/aurora": patch
---

Fix package publishing issues found during initial consumer testing:

- Removed `@cobaltcore-dev/policy-engine` and `@cobaltcore-dev/signal-openstack` from published `dependencies` — both are private packages bundled into the server build via tsup and must not be listed as npm dependencies
- Added `permission_policies/` to the `files` array so OpenStack YAML files are included in the published package
