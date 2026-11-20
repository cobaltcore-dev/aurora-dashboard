---
"@cobaltcore-dev/aurora": minor
---

Add Kubernetes BFF procedures for Gardener shoots

- Add cluster operations: list, getByName, create, update, replace, reconcile, confirmDeletion, delete
- Add getAdminKubeconfig and getGardenKubeconfig mutations (both return kubeconfigs with credentials)
- Add getPermissions query for SelfSubjectAccessReview-based capability checks
- Add getGettingStarted query for scikube markdown ConfigMap
- Add cloudProfiles.list and externalNetworks.list lookups for create wizard
- Gardener errors now reach the browser as fixed messages, except a sanitised validation message on 400/409/422 (token and Bearer headers are redacted)
- `getGardenKubeconfig` returns a kubeconfig that contains the user's project-scoped Keystone token by design (parity with Elektra, see D2 in the plan)
