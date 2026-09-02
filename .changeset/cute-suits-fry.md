---
"@cobaltcore-dev/aurora": patch
---

Fix Ceph bucket list allowing "Empty Bucket" to be triggered on a bucket that already has no content (#1107):

- `EmptyBucketModal` now re-verifies bucket contents on open and shows an info-only "This bucket is already empty" view (with just a Close button) instead of the destructive confirm form, guarding against stale list-cache data reaching the modal. This matches Swift's existing "Empty Container" behavior: the row action stays visible, and the live check on open decides whether there's anything to actually delete.

