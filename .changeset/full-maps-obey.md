---
"@cobaltcore-dev/aurora": patch
---

Swift storage: container and folder creation now reject duplicate names, matching Ceph's existing bucket/folder behavior. Server-side duplicate detection for container creation now branches on Swift's idempotent container-PUT response status (201 created vs 202 already existed) instead of a HEAD pre-check, closing a race condition where concurrent creates could silently both succeed; this is paired with inline client validation. Folder creation adds the same client-side duplicate check Ceph already has. The Ceph bucket and Swift container creation modals now stay open on any failure (not just name conflicts) so the user can retry, closing only on success or Cancel. Also fixes a bug in the shared modal-tracking hook (`useModalTracking`) where unmemoized callbacks caused an effect in two Swift delete modals to re-run on every render instead of only on open/close.

Container creation no longer applies caller-supplied metadata, ACL, or quota settings to a container that already exists before reporting the conflict — those settings are now applied via a follow-up request only after a genuine create. Folder creation is now also verified server-side via an atomic conditional write (rejecting the write if the folder already exists), which additionally fixes folder markers being stored as a JSON blob instead of a proper zero-byte folder object.
