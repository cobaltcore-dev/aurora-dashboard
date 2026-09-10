---
"@cobaltcore-dev/aurora": patch
---

Swift storage: container and folder creation now reject duplicate names, matching Ceph's existing bucket/folder behavior. Container creation adds a server-side existence check with a CONFLICT error plus inline client validation; folder creation adds the same client-side duplicate check Ceph already has. Also fixes a bug in the shared modal-tracking hook (`useModalTracking`) where unmemoized callbacks caused an effect in two Swift delete modals to re-run on every render instead of only on open/close.
