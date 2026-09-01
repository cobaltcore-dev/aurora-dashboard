---
"@cobaltcore-dev/aurora": minor
---

Fix Ceph bucket list allowing "Empty Bucket" to be triggered on a bucket that already has no content (#1107):

- Hide the row-level "Empty Bucket" action once the bucket's list metadata reports zero objects and zero bytes, matching the bucket detail page's existing behavior
- `EmptyBucketModal` now independently re-verifies bucket contents on open and shows an info-only "This bucket is already empty" view (with just a Close button) instead of the destructive confirm form, guarding against stale list-cache data reaching the modal

