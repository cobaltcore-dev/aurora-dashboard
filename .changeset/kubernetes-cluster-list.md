---
"@cobaltcore-dev/aurora": minor
---

Add Kubernetes (Gardener) cluster management

**BFF Foundation**
- Add the Kubernetes BFF foundation: project-scoped procedures that resolve landscapes from the service catalog (`persephone-qa/canary/prod`) and authenticate server-side with Keystone tokens
- Map Gardener errors, including error bodies returned with HTTP 200, to tRPC error codes without signing the user out when only Gardener rejects the credentials
- Note: the app router now has a `kubernetes` key; custom routers passed to `createServer` must not use that name

**BFF Procedures**
- Add cluster operations: list, getByName, create, update, replace, reconcile, confirmDeletion, delete
- Add getAdminKubeconfig and getGardenKubeconfig mutations (both return kubeconfigs with credentials)
- Add getPermissions query for SelfSubjectAccessReview-based capability checks
- Add getGettingStarted query for scikube markdown ConfigMap
- Add cloudProfiles.list and externalNetworks.list lookups for create wizard
- Gardener errors now reach the browser as fixed messages, except a sanitised validation message on 400/409/422 (token and Bearer headers are redacted)

**UI**
- Add Kubernetes scope registration and nav entry gated by Persephone service catalog presence
- Add landscape selector (TabBar) with URL param persistence (`?landscape=qa`)
- Add cluster list with DataGrid: Status, Name (with ID), Readiness, Last Operation, Kubernetes Version, Actions
- Add client-side search, sort, and filter with URL param sync
- Add loading, error, empty, and access-denied states
- Add auto-refresh (30s polling)
