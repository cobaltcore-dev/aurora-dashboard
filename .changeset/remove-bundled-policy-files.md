---
"@cobaltcore-dev/aurora": major
---

Remove bundled OpenStack policy files from the aurora package. Consumers must now supply their own policy files via the `policyDir` option in `createServer`. The built-in `permission_policies/` directory is no longer shipped with the package.
