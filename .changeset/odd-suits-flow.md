---
"@cobaltcore-dev/aurora": patch
---

Ceph object storage UI fixes and storage-route improvements:

- Add an "All buckets" breadcrumb in the object browser so users can navigate directly back to the bucket list.
- Introduce a dynamic `storageType` route segment (`buckets` for Ceph, `containers` for Swift) and enforce the canonical segment per provider, redirecting non-canonical URLs.
- Always pass the required `storageType` parameter when navigating back to the bucket/container list, preventing a runtime navigation failure.
- Scope the bucket list "select all" to the currently visible rows so selections hidden by an active search filter are no longer dropped.
- Align Ceph terminology with S3 ("container" → "bucket") across types, UI, and locale strings.
